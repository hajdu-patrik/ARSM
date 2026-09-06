#!/usr/bin/env python3
"""Verifies that every stored profile picture resolves to a real object in object storage.

This script wrapped the one-off backfill that copied pictures out of the Postgres bytea column.
The DropProfilePictureBytes migration removed that column, so the copy and dry-run passes are
gone; what remains is the verification pass. It loads local secrets, invokes the maintenance
entrypoint in the API project, masks the output, and writes a sanitized report.

Usage from the repository root:

    python scripts/migrate-profile-pictures-to-object-storage.py
    python scripts/migrate-profile-pictures-to-object-storage.py --verify

Both forms do the same thing; --verify is accepted so existing invocations keep working. The run
is read-only: it touches neither the database nor the bucket.
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Sequence

sys.path.insert(0, str(Path(__file__).resolve().parent))

from importlib import util as importlib_util

MIGRATE_ARGUMENT = "--migrate-profile-pictures"
MODE_NAME = "verify"
REPORT_FILE_NAME = "profile-picture-migration-summary.json"
API_PROJECT = Path("app") / "AutoService.ApiService" / "AutoService.ApiService.csproj"
DEFAULT_TIMEOUT_SECONDS = 1800


def _load_runner_module():
    """Load the canonical test runner module to reuse its secret loading and masking."""
    runner_path = Path(__file__).resolve().parent / "run-local-test-suite.py"
    spec = importlib_util.spec_from_file_location("arsm_local_test_runner", runner_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot load the local test runner from {runner_path.name}.")

    module = importlib_util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def build_command(project_path: Path) -> list[str]:
    """Build the dotnet invocation for the maintenance entrypoint."""
    return [
        "dotnet",
        "run",
        "--project",
        str(project_path),
        "--",
        MIGRATE_ARGUMENT,
    ]


def extract_report(stdout: str) -> dict | None:
    """Pull the JSON report out of stdout, ignoring the host's own log lines."""
    start = stdout.find("{")
    while start != -1:
        try:
            return json.loads(stdout[start:])
        except json.JSONDecodeError:
            start = stdout.find("{", start + 1)
    return None


def write_report(artifacts_dir: Path, return_code: int, report: dict | None, output_tail: Sequence[str]) -> Path:
    """Write the sanitized report next to the other local test artifacts."""
    artifacts_dir.mkdir(parents=True, exist_ok=True)
    report_path = artifacts_dir / REPORT_FILE_NAME

    payload = {
        "schemaVersion": 1,
        "mode": MODE_NAME,
        "overallStatus": (report or {}).get("overallStatus", "failed" if return_code else "passed"),
        "returnCode": return_code,
        "aiInstructions": [
            "Use this sanitized report as the primary signal for profile-picture object integrity.",
            "Every entry in missingObjects is a person row whose picture is unreachable in the bucket.",
        ],
        "result": report,
        "outputTail": list(output_tail),
    }

    report_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return report_path


def parse_args(argv: Sequence[str]) -> argparse.Namespace:
    """Parse the command line. Verification is the only remaining mode."""
    parser = argparse.ArgumentParser(
        description="Verify that every stored profile picture resolves to a non-empty object.",
    )
    parser.add_argument(
        "--verify",
        action="store_true",
        help="Accepted for backwards compatibility; verification runs either way.",
    )
    return parser.parse_args(list(argv))


def main(argv: Sequence[str]) -> int:
    parse_args(argv)

    root_dir = Path(__file__).resolve().parents[1]
    artifacts_dir = root_dir / "tests" / ".artifacts"

    runner = _load_runner_module()
    environment = os.environ.copy()
    secret_values = runner.EnvironmentLoader(root_dir).load(environment)
    sanitizer = runner.OutputSanitizer(root_dir, secret_values)

    environment.setdefault("ASPNETCORE_ENVIRONMENT", "Development")

    print("[INFO] Verifying profile-picture objects...")

    try:
        completed = subprocess.run(
            build_command(root_dir / API_PROJECT),
            cwd=root_dir,
            env=environment,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            check=False,
            timeout=DEFAULT_TIMEOUT_SECONDS,
        )
        stdout = completed.stdout
        stderr = completed.stderr
        return_code = completed.returncode
    except subprocess.TimeoutExpired as error:
        stdout = error.stdout if isinstance(error.stdout, str) else ""
        stderr = f"Verification timed out after {DEFAULT_TIMEOUT_SECONDS} seconds."
        return_code = 124

    report = extract_report(stdout)
    output_tail = sanitizer.sanitize("\n".join(part for part in (stdout, stderr) if part)).splitlines()[-40:]

    report_path = write_report(artifacts_dir, return_code, report, output_tail)

    if report is None:
        print("[FAILED] Verification produced no report. See the sanitized output tail.")
    else:
        print(
            f"[{'PASSED' if report.get('overallStatus') == 'passed' else 'FAILED'}] "
            f"mode={report.get('mode')} checked={report.get('candidates')} "
            f"missingObjects={len(report.get('missingObjects') or [])}",
        )

    print(f"[INFO] Sanitized report written to {report_path.relative_to(root_dir)}")
    return return_code


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
