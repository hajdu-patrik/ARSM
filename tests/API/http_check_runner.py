#!/usr/bin/env python3
"""Scaffolding for the checks that sign in themselves: the login helpers, the shared entry point and its JSON report."""

from __future__ import annotations

import json
import ssl
from typing import Any, Callable

from http_check_support import (
    Credentials,
    HttpClient,
    StepResult,
    assert_status,
    read_allowed_origin,
    read_credentials,
    read_required_env,
)


class CheckSkipped(Exception):
    """Raised by a check that cannot run for a reason that is no failure (the report says skipped)."""


def sign_in(
    base_url: str, origin: str, credentials: Credentials, step: str, results: list[StepResult],
) -> tuple[HttpClient, dict[str, Any]]:
    """Logs in on a fresh cookie jar (one more independent session) and returns the client with the login response."""
    client = HttpClient(base_url, origin)
    status, body = client.request_json(
        "POST", "/api/auth/login", {"email": credentials.email, "password": credentials.password},
    )
    assert_status(step, status, {200}, results)
    return client, json.loads(body)


def sign_in_with_available_login(
    base_url: str, origin: str, results: list[StepResult],
) -> tuple[HttpClient, dict[str, Any]]:
    """Signs in with the first configured credentials the API does not rate-limit; skips the check when all are."""
    login_statuses: list[int] = []

    for credentials in read_credentials():
        results.clear()
        client = HttpClient(base_url, origin)
        status, body = client.request_json(
            "POST", "/api/auth/login", {"email": credentials.email, "password": credentials.password},
        )
        login_statuses.append(status)

        if status == 429:
            results.append(StepResult(step="login", expected=[200], actual=status, status="failed"))
            continue

        assert_status("login", status, {200}, results)
        return client, json.loads(body)

    raise CheckSkipped(f"All available credentials were rate-limited during login. Login statuses: {login_statuses}")


def run_check(check: Callable[[str, str, list[StepResult]], None]) -> int:
    """Runs a check against the API named in the environment and prints the sanitized report the runner reads."""
    results: list[StepResult] = []
    report: dict[str, Any] = {"status": "passed"}
    try:
        # The local API uses a development certificate.
        ssl._create_default_https_context = ssl._create_unverified_context  # noqa: SLF001
        check(read_required_env("AutoService_ApiService_HostAddress"), read_allowed_origin(), results)
    except CheckSkipped as skipped:
        report = {"status": "skipped", "reason": str(skipped)}
    except Exception as error:  # noqa: BLE001
        report = {"status": "failed", "error": str(error)}

    report["checks"] = [result.__dict__ for result in results]
    print(json.dumps(report, ensure_ascii=False))
    return 0 if report["status"] == "passed" else 1
