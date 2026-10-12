#!/usr/bin/env python3
"""Checks the 200-line-per-quote cap (D24) on POST /api/quotes/{id}/lines - not expressible in httpyac."""

from __future__ import annotations

import json
import os
import ssl
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from http_check_support import (  # noqa: E402
    HttpClient,
    StepResult,
    assert_condition,
    assert_status,
    find_anchor_quote,
    read_allowed_origin,
    read_credentials,
)

QUOTES_PATH = "/api/quotes"
VEHICLES_PATH = "/api/vehicles"

# QuoteValidation.MaxLineCount. Kept as a literal rather than parsed out of the C# source:
# the point of the check is to fail loudly when the API's cap and this expectation diverge.
MAX_LINE_COUNT = 200


def create_fixture_quote(client: HttpClient, vehicle_id: int, results: list[StepResult]) -> dict:
    """Creates the draft quote this check fills up, and returns its detail payload."""
    status, body = client.request_json(
        "POST",
        f"{VEHICLES_PATH}/{vehicle_id}/quotes",
        {"title": f"Line limit fixture {int(time.time())}"},
    )
    assert_status("create-fixture-quote", status, {201}, results)
    return json.loads(body)


def add_line(client: HttpClient, quote_id: int, version: int, ordinal: int) -> tuple[int, str]:
    """Adds one manually priced part line, carrying the version the caller last saw."""
    return client.request_json(
        "POST",
        f"{QUOTES_PATH}/{quote_id}/lines",
        {
            "lineKind": "Part",
            "quantity": 1,
            "description": f"Line limit fixture line {ordinal}",
            "netUnitPrice": 100,
            "vatRatePercent": 27,
            "version": version,
        },
    )


def run_checks(client: HttpClient, results: list[StepResult]) -> None:
    """Fills a fresh quote to the cap, asserts the next add is refused, then cleans up."""
    vehicle_id = int(find_anchor_quote(client, results)["vehicleId"])
    quote = create_fixture_quote(client, vehicle_id, results)
    quote_id = int(quote["id"])
    version = int(quote["version"])

    try:
        for ordinal in range(1, MAX_LINE_COUNT + 1):
            status, body = add_line(client, quote_id, version, ordinal)
            if status != 201:
                assert_status(f"fill-to-cap-line-{ordinal}", status, {201}, results)
            quote = json.loads(body)
            version = int(quote["version"])

        assert_condition(
            "cap-reached",
            len(quote["lines"]) == MAX_LINE_COUNT,
            f"Expected {MAX_LINE_COUNT} lines on the fixture quote, got {len(quote['lines'])}.",
            results,
        )

        over_cap_status, _ = add_line(client, quote_id, version, MAX_LINE_COUNT + 1)
        assert_status("line-over-cap-rejected", over_cap_status, {422}, results)

        status, body = client.request_json("GET", f"{QUOTES_PATH}/{quote_id}")
        assert_status("reread-fixture-quote", status, {200}, results)
        reread = json.loads(body)
        assert_condition(
            "rejected-line-not-persisted",
            len(reread["lines"]) == MAX_LINE_COUNT,
            f"The refused line must not be stored; quote now has {len(reread['lines'])} lines.",
            results,
        )
        version = int(reread["version"])
    except Exception:
        # Best-effort cleanup only: asserting here would mask the real failure with whatever
        # the delete returns, and the version in hand may already be stale.
        client.request_json("DELETE", f"{QUOTES_PATH}/{quote_id}?version={version}")
        raise

    delete_status, _ = client.request_json("DELETE", f"{QUOTES_PATH}/{quote_id}?version={version}")
    assert_status("delete-fixture-quote", delete_status, {204}, results)


def main() -> int:
    """Authenticates, runs the checks, and prints the sanitized report."""
    base_url = os.getenv("AutoService_ApiService_HostAddress", "").strip()
    if not base_url:
        raise RuntimeError("Missing AutoService_ApiService_HostAddress environment variable.")

    # The local API uses a development certificate.
    ssl._create_default_https_context = ssl._create_unverified_context  # noqa: SLF001

    results: list[StepResult] = []
    login_attempt_statuses: list[int] = []

    for credential in read_credentials():
        results.clear()
        client = HttpClient(base_url, read_allowed_origin())
        login_status, _ = client.request_json(
            "POST",
            "/api/auth/login",
            {"email": credential.email, "password": credential.password},
        )
        login_attempt_statuses.append(login_status)

        if login_status == 429:
            results.append(StepResult(step="login", expected=[200], actual=login_status, status="failed"))
            continue

        assert_status("login", login_status, {200}, results)
        run_checks(client, results)
        client.request_json("POST", "/api/auth/logout")
        break
    else:
        if login_attempt_statuses and all(status == 429 for status in login_attempt_statuses):
            print(json.dumps({
                "status": "skipped",
                "reason": "All available credentials were rate-limited during login.",
                "checks": [result.__dict__ for result in results],
            }, ensure_ascii=False))
            return 0

        raise RuntimeError(
            f"Quote line limit checks could not authenticate. Login statuses: {login_attempt_statuses}",
        )

    print(json.dumps({"status": "passed", "checks": [result.__dict__ for result in results]}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
