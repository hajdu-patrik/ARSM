#!/usr/bin/env python3
"""Run ARSM local test suites and publish sanitized AI-readable results."""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable, Sequence
from urllib.parse import unquote, urlparse

TARGET_ORDER = ("playwright", "http", "sql")
SENSITIVE_NAME_PATTERN = re.compile(r"(?i)(password|passwd|secret|token|cookie|key|connection|pgpassword)")
POSTGRES_URI_PATTERN = re.compile(r"postgres(?:ql)?://[^\s\"']+", re.IGNORECASE)
ASSIGNMENT_SECRET_PATTERN = re.compile(
    r"(?i)\b(password|passwd|secret|token|authorization|cookie|connectionstring|pgpassword)\b([\s:=]+)([^\s,;]+)",
)
WINDOWS_ABSOLUTE_PATH_PATTERN = re.compile(r"[A-Za-z]:[\\/](?:[^\s\"'<>|:]+[\\/])*[^\s\"'<>|:]*")
UNIX_ABSOLUTE_PATH_PATTERN = re.compile(r"(?<![\w.])/[^\s\"']+(?:/[^\s\"']+)*")


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


class OutputSanitizer:
    """Masks local paths, loaded secret values, and credential-shaped output."""

    def __init__(self, root_dir: Path, secret_values: Iterable[str]) -> None:
        self.root_dir = root_dir.resolve()
        self.secret_values = sorted(
            {value for value in secret_values if value and len(value) >= 4},
            key=len,
            reverse=True,
        )

    def sanitize(self, text: str) -> str:
        """Return text safe to print or store in artifacts."""
        sanitized = text.replace(str(self.root_dir), "<repo>")
        sanitized = sanitized.replace(self.root_dir.as_posix(), "<repo>")

        for secret_value in self.secret_values:
            sanitized = sanitized.replace(secret_value, "<redacted>")

        sanitized = POSTGRES_URI_PATTERN.sub("postgresql://<redacted>", sanitized)
        sanitized = ASSIGNMENT_SECRET_PATTERN.sub(r"\1\2<redacted>", sanitized)
        sanitized = WINDOWS_ABSOLUTE_PATH_PATTERN.sub("<local-path>", sanitized)
        sanitized = UNIX_ABSOLUTE_PATH_PATTERN.sub(self._sanitize_unix_path, sanitized)
        return sanitized

    @staticmethod
    def _sanitize_unix_path(match: re.Match[str]) -> str:
        value = match.group(0)
        if value.startswith(("/api/", "/health", "/alive")):
            return value
        return "<local-path>"


class EnvironmentLoader:
    """Loads simple KEY=VALUE files without shell-specific behavior."""

    def __init__(self, root_dir: Path) -> None:
        self.root_dir = root_dir

    def load(self, environment: dict[str, str]) -> list[str]:
        """Load local test env files and return values that must be masked."""
        secret_values: list[str] = []
        for env_file in (self.root_dir / ".secrets", self.root_dir / "tests" / ".env"):
            secret_values.extend(self._load_file(env_file, environment))

        for key, value in environment.items():
            if SENSITIVE_NAME_PATTERN.search(key):
                secret_values.append(value)

        return secret_values

    @staticmethod
    def _load_file(env_file: Path, environment: dict[str, str]) -> list[str]:
        if not env_file.is_file():
            return []

        loaded_values: list[str] = []
        for raw_line in env_file.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue

            key, value = line.split("=", 1)
            key = key.strip().removeprefix("export ").strip()
            value = EnvironmentLoader._clean_value(value.strip())
            if not key:
                continue

            environment[key] = value
            loaded_values.append(value)

        return loaded_values

    @staticmethod
    def _clean_value(value: str) -> str:
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
            return value[1:-1]
        return value


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
        )

        return CommandResult(
            command_name=command_name,
            return_code=completed.returncode,
            stdout=self.sanitizer.sanitize(completed.stdout),
            stderr=self.sanitizer.sanitize(completed.stderr),
        )


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
        environment = {**self.environment, "PORT": self.environment.get("PORT", "5173")}
        result = self.command_runner.run("playwright", [npm, "run", "e2e"], webui_dir, environment)
        return self._command_suite_result("playwright", result)

    def _run_http(self) -> SuiteResult:
        """Execute HTTP endpoint test suite via HTTPYAC."""
        npx = self._required_executable("npx")
        environment = {**self.environment, "NODE_TLS_REJECT_UNAUTHORIZED": "0"}
        result = self.command_runner.run(
            "http",
            [npx, "--yes", "httpyac", "tests/API/**/*.http", "--all", "--json"],
            self.root_dir,
            environment,
        )
        details = self._http_summary(result.stdout)
        status = "passed" if result.return_code == 0 and details.get("failedRequests", 0) == 0 and details.get("erroredRequests", 0) == 0 else "failed"
        return SuiteResult("http", status, result.return_code, details, self._tail(result.stdout + result.stderr))

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
    def _http_summary(output: str) -> dict[str, object]:
        try:
            payload = json.loads(output)
            summary = payload.get("summary", {}) if isinstance(payload, dict) else {}
        except json.JSONDecodeError:
            return {"parseError": "HTTPYAC JSON output could not be parsed."}

        return {
            "totalRequests": int(summary.get("totalRequests", 0) or 0),
            "successRequests": int(summary.get("successRequests", 0) or 0),
            "failedRequests": int(summary.get("failedRequests", 0) or 0),
            "erroredRequests": int(summary.get("erroredRequests", 0) or 0),
        }

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