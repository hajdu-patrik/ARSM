#!/usr/bin/env python3
"""Run ARSM local test suites and publish sanitized AI-readable results."""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Sequence
from urllib.parse import unquote, urlparse

from httpyac_summary import extract_http_summary
# Re-exported: migrate-profile-pictures-to-object-storage.py reaches these through this module.
from test_suite_secrets import POSTGRES_URI_PATTERN, EnvironmentLoader, OutputSanitizer

TARGET_ORDER = ("playwright", "http", "sql")

# Behaviour that HTTPYAC cannot express: multipart upload contracts, a streaming SSE round
# trip, a per-quote line cap that only shows up after 200 successful additions, and a
# binary PDF response whose text has to be read back.
# (report key, command label, script path, human-readable name)
PYTHON_HTTP_CHECKS = (
    (
        "profilePictureUploadCheck",
        "http-profile-picture-upload-check",
        "tests/API/profile/profile-picture-upload-check.py",
        "Profile picture upload check",
    ),
    (
        "appointmentUpdatesCheck",
        "http-appointment-updates-check",
        "tests/API/appointments/appointment-updates-check.py",
        "Appointment live updates check",
    ),
    (
        "quoteLineLimitCheck",
        "http-quote-line-limit-check",
        "tests/API/quotes/quote-line-limit-check.py",
        "Quote line limit check",
    ),
    (
        "quotePdfCheck",
        "http-quote-pdf-check",
        "tests/API/quotes/quote-pdf-check.py",
        "Quote PDF check",
    ),
)
DEFAULT_COMMAND_TIMEOUT_SECONDS = 300


@dataclass(frozen=True)
class CommandResult:
    """Captured process result after a suite command exits."""

    command_name: str
    return_code: int
    stdout: str
    stderr: str


@dataclass
class SuiteResult:
    """Sanitized result block written to the local report."""

    name: str
    status: str
    return_code: int = 0
    details: dict[str, object] = field(default_factory=dict)
    output_tail: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class PostgresConnection:
    """PostgreSQL credentials resolved from local, gitignored configuration."""

    user: str
    password: str
    database: str



class CommandRunner:
    """Executes local commands with captured stdout and stderr."""

    def __init__(self, sanitizer: OutputSanitizer) -> None:
        self.sanitizer = sanitizer

    def run(
        self,
        command_name: str,
        command: Sequence[str],
        cwd: Path,
        environment: dict[str, str],
        input_text: str | None = None,
    ) -> CommandResult:
        timeout_seconds = self._timeout_seconds(environment)
        try:
            completed = subprocess.run(
                command,
                cwd=cwd,
                env=environment,
                input=input_text,
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                check=False,
                timeout=timeout_seconds,
            )
        except subprocess.TimeoutExpired as error:
            stdout = self._timeout_output(error.stdout)
            stderr = self._timeout_output(error.stderr)
            timeout_message = f"{command_name} timed out after {timeout_seconds} seconds."
            return CommandResult(
                command_name=command_name,
                return_code=124,
                stdout=self.sanitizer.sanitize(stdout),
                stderr=self.sanitizer.sanitize("\n".join(part for part in (stderr, timeout_message) if part)),
            )

        return CommandResult(
            command_name=command_name,
            return_code=completed.returncode,
            stdout=self.sanitizer.sanitize(completed.stdout),
            stderr=self.sanitizer.sanitize(completed.stderr),
        )

    def _timeout_seconds(self, environment: dict[str, str]) -> int:
        raw_timeout = environment.get("ARSM_TEST_COMMAND_TIMEOUT_SECONDS", str(DEFAULT_COMMAND_TIMEOUT_SECONDS))
        try:
            return max(1, int(raw_timeout))
        except ValueError:
            return DEFAULT_COMMAND_TIMEOUT_SECONDS

    def _timeout_output(self, value: str | bytes | None) -> str:
        if value is None:
            return ""
        if isinstance(value, bytes):
            return value.decode("utf-8", errors="replace")
        return value


class LocalTestRunner:
    """Coordinates Playwright, HTTPYAC, and SQL validation suites."""

    def __init__(self, root_dir: Path, artifacts_dir: Path, environment: dict[str, str], sanitizer: OutputSanitizer) -> None:
        self.root_dir = root_dir
        self.artifacts_dir = artifacts_dir
        self.environment = environment
        self.sanitizer = sanitizer
        self.command_runner = CommandRunner(sanitizer)

    def run_targets(self, targets: Sequence[str]) -> list[SuiteResult]:
        """Execute test suite targets in canonical order and collect results."""
        suite_results: list[SuiteResult] = []
        for target in targets:
            print(f"[INFO] Running {target} suite...")
            suite_result = self._run_target(target)
            suite_results.append(suite_result)
            print(f"[{suite_result.status.upper()}] {target}")
        return suite_results

    def _run_target(self, target: str) -> SuiteResult:
        if target == "playwright":
            return self._run_playwright()
        if target == "http":
            return self._run_http()
        if target == "sql":
            return self._run_sql()
        return SuiteResult(target, "failed", 1, {"error": f"Unknown target: {target}"})

    def _run_playwright(self) -> SuiteResult:
        """Execute Playwright E2E test suite in WebUI directory."""
        npm = self._required_executable("npm")
        webui_dir = self.root_dir / "app" / "AutoService.WebUI"
        environment = {**self.environment, "PORT": self.environment.get("PORT", "5173"),
                       "PLAYWRIGHT_WORKERS": self.environment.get("PLAYWRIGHT_WORKERS", "3")}
        specs = self.environment.get("ARSM_E2E_SPECS", "").split()  # set by select-e2e-specs.py --run
        result = self.command_runner.run("playwright", [npm, "run", "e2e", *(["--", *specs] if specs else [])], webui_dir, environment)
        return self._command_suite_result("playwright", result)

    def _run_http(self) -> SuiteResult:
        """Execute HTTP endpoint test suite via HTTPYAC plus the streaming/behaviour checks."""
        npx = self._required_executable("npx")
        environment = {**self.environment, "NODE_TLS_REJECT_UNAUTHORIZED": "0"}

        script_results = [
            (detail_key, self.command_runner.run(command_name, [sys.executable, script], self.root_dir, environment), label)
            for detail_key, command_name, script, label in PYTHON_HTTP_CHECKS
        ]

        result = self.command_runner.run(
            "http",
            [npx, "--yes", "httpyac", "tests/API/**/*.http", "--all", "--json"],
            self.root_dir,
            environment,
        )

        details = extract_http_summary(result.stdout)
        checks_passed = True
        output = result.stdout + result.stderr

        for detail_key, script_result, label in script_results:
            script_details = self._extract_json_payload(script_result.stdout) or {
                "status": "failed",
                "error": f"{label} did not return JSON output.",
            }
            details[detail_key] = script_details
            script_status = str(script_details.get("status", "failed"))
            checks_passed = checks_passed and script_result.return_code == 0 and script_status in {"passed", "skipped"}
            output += script_result.stdout + script_result.stderr

        http_requests_are_clean = result.return_code == 0 and details.get("failedRequests", 0) == 0 and details.get("erroredRequests", 0) == 0
        status = "passed" if http_requests_are_clean and checks_passed else "failed"

        return SuiteResult("http", status, 0 if status == "passed" else 1, details, self._tail(output))

    def _run_sql(self) -> SuiteResult:
        """Execute SQL validation suite against PostgreSQL container."""
        docker = self._required_executable("docker")
        connection = self._resolve_postgres_connection()
        container = self._detect_postgres_container(docker)
        files: list[dict[str, object]] = []

        for sql_file in sorted((self.root_dir / "tests" / "Database").rglob("*.sql")):
            result = self.command_runner.run(
                "sql",
                [
                    docker,
                    "exec",
                    "-i",
                    "-e",
                    f"PGPASSWORD={connection.password}",
                    container,
                    "psql",
                    "-U",
                    connection.user,
                    "-h",
                    "localhost",
                    "-d",
                    connection.database,
                    "-v",
                    "ON_ERROR_STOP=1",
                    "-q",
                    "-f",
                    "-",
                ],
                self.root_dir,
                self.environment,
                input_text=sql_file.read_text(encoding="utf-8"),
            )
            files.append(
                {
                    "path": sql_file.relative_to(self.root_dir).as_posix(),
                    "status": "passed" if result.return_code == 0 else "failed",
                    "outputTail": self._tail(result.stdout + result.stderr) if result.return_code != 0 else [],
                },
            )

        failed = sum(1 for file_result in files if file_result["status"] == "failed")
        return SuiteResult("sql", "passed" if failed == 0 else "failed", 1 if failed else 0, {"total": len(files), "failed": failed, "files": files})

    def _resolve_postgres_connection(self) -> PostgresConnection:
        """Parse PostgreSQL credentials from environment or local MCP configuration."""
        connection_string = self.environment.get("ARSM_MCP_POSTGRES_CONNECTION_STRING", "")
        if not connection_string or connection_string.startswith("SET_LOCAL_"):
            connection_string = self._read_connection_string_from_local_config()

        if not connection_string:
            raise RuntimeError("PostgreSQL connection string is missing. Set ARSM_MCP_POSTGRES_CONNECTION_STRING in local secrets or MCP config.")

        parsed = urlparse(connection_string)
        if parsed.scheme not in {"postgres", "postgresql"}:
            raise RuntimeError("PostgreSQL connection string must use postgres:// or postgresql://.")

        if not parsed.username or parsed.password is None or not parsed.path.strip("/"):
            raise RuntimeError("PostgreSQL connection string is incomplete.")

        return PostgresConnection(unquote(parsed.username), unquote(parsed.password), unquote(parsed.path.strip("/")))

    def _read_connection_string_from_local_config(self) -> str:
        for config_file in (self.root_dir / ".vscode" / "mcp.json", self.root_dir / ".claude" / ".mcp.json"):
            if not config_file.is_file():
                continue
            match = POSTGRES_URI_PATTERN.search(config_file.read_text(encoding="utf-8", errors="replace"))
            if match:
                return match.group(0)
        return ""

    def _detect_postgres_container(self, docker: str) -> str:
        """Identify running PostgreSQL container by environment override or docker ps."""
        explicit_container = self.environment.get("ARSM_SQL_TEST_CONTAINER", "").strip()
        if explicit_container:
            return explicit_container

        result = self.command_runner.run("docker-ps", [docker, "ps", "--format", "{{.Names}} {{.Image}}"], self.root_dir, self.environment)
        if result.return_code != 0:
            raise RuntimeError("Docker is not available or cannot list containers.")

        for line in result.stdout.splitlines():
            if "postgres" in line.lower():
                return line.split()[0]
        raise RuntimeError("No running PostgreSQL container found. Start AppHost first or set ARSM_SQL_TEST_CONTAINER.")

    def _command_suite_result(self, name: str, result: CommandResult) -> SuiteResult:
        status = "passed" if result.return_code == 0 else "failed"
        return SuiteResult(name, status, result.return_code, output_tail=self._tail(result.stdout + result.stderr))

    @staticmethod
    def _extract_json_payload(output: str) -> dict[str, object] | None:
        try:
            payload = json.loads(output)
            if isinstance(payload, dict):
                return payload
        except json.JSONDecodeError:
            pass

        decoder = json.JSONDecoder()
        for index, char in enumerate(output):
            if char != "{":
                continue

            try:
                payload, _ = decoder.raw_decode(output[index:])
            except json.JSONDecodeError:
                continue

            if isinstance(payload, dict):
                return payload

        return None

    @staticmethod
    def _tail(output: str, limit: int = 40) -> list[str]:
        return [line for line in output.splitlines() if line.strip()][-limit:]

    @staticmethod
    def _required_executable(name: str) -> str:
        executable = shutil.which(name)
        if executable:
            return executable
        raise RuntimeError(f"Required command not found: {name}")


def parse_args(argv: Sequence[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run ARSM local test suites with sanitized output.")
    parser.add_argument(
        "targets",
        nargs="*",
        choices=("all", *TARGET_ORDER),
        default=["all"],
        help="Suites to run. Default: all.",
    )
    return parser.parse_args(argv)


def normalize_targets(raw_targets: Sequence[str]) -> list[str]:
    if not raw_targets or "all" in raw_targets:
        return list(TARGET_ORDER)

    selected: list[str] = []
    for target in raw_targets:
        if target not in selected:
            selected.append(target)
    return selected


def write_report(root_dir: Path, artifacts_dir: Path, targets: Sequence[str], results: Sequence[SuiteResult]) -> Path:
    artifacts_dir.mkdir(parents=True, exist_ok=True)
    report_path = artifacts_dir / "test-suite-summary.json"
    report = {
        "schemaVersion": 1,
        "targets": list(targets),
        "overallStatus": "passed" if all(result.status == "passed" for result in results) else "failed",
        "aiInstructions": [
            "Use this sanitized report as the primary AI test signal.",
            "For failed suites, inspect status/details/outputTail, then add, fix, or investigate tests in the matching layer.",
            "Do not request or publish raw local logs, absolute paths, .env contents, cookies, tokens, or connection strings.",
        ],
        "results": [result.__dict__ for result in results],
    }
    report_path.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return report_path.relative_to(root_dir)


def main(argv: Sequence[str]) -> int:
    args = parse_args(argv)
    root_dir = Path(__file__).resolve().parents[1]
    artifacts_dir = root_dir / "tests" / ".artifacts"
    environment = os.environ.copy()
    secret_values = EnvironmentLoader(root_dir).load(environment)
    sanitizer = OutputSanitizer(root_dir, secret_values)
    targets = normalize_targets(args.targets)

    try:
        runner = LocalTestRunner(root_dir, artifacts_dir, environment, sanitizer)
        results = runner.run_targets(targets)
    except Exception as exc:
        sanitized_error = sanitizer.sanitize(str(exc))
        results = [SuiteResult("runner", "failed", 1, {"error": sanitized_error})]
        print(f"[FAILED] runner: {sanitized_error}", file=sys.stderr)

    report_path = write_report(root_dir, artifacts_dir, targets, results)
    print(f"[INFO] Sanitized report written to {report_path.as_posix()}")
    return 0 if all(result.status == "passed" for result in results) else 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))