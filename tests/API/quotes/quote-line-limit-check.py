#!/usr/bin/env python3
"""Checks the 200-line-per-quote cap (D24) on POST /api/quotes/{id}/lines - not expressible in httpyac."""

from __future__ import annotations

import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from http_check_runner import run_check, sign_in_with_available_login  # noqa: E402
from http_check_support import (  # noqa: E402
    HttpClient,
    StepResult,
    assert_condition,
    assert_status,
    find_anchor_quote,
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


def amounts_match(quote: dict, net: float, vat: float, gross: float) -> bool:
    """True when the quote totals equal the expected amounts and gross is net + vat."""
    totals = (float(quote["totalNet"]), float(quote["totalVat"]), float(quote["totalGross"]))
    close = all(abs(actual - expected) < 0.005 for actual, expected in zip(totals, (net, vat, gross)))
    return close and abs(totals[2] - (totals[0] + totals[1])) < 0.005


def check_edits_at_cap(client: HttpClient, quote_id: int, version: int, full_quote: dict, results: list[StepResult]) -> int:
    """At the cap an update still works (no new line), a delete frees one slot and the add after it fits again."""
    first_line = full_quote["lines"][0]
    status, body = client.request_json(
        "PUT",
        f"{QUOTES_PATH}/{quote_id}/lines/{first_line['id']}",
        {
            "lineKind": "Part",
            "quantity": 2,
            "description": first_line["description"],
            "netUnitPrice": 100,
            "vatRatePercent": 27,
            "version": version,
        },
    )
    assert_status("update-line-at-cap", status, {200}, results)
    updated = json.loads(body)
    assert_condition(
        "update-at-cap-keeps-count",
        len(updated["lines"]) == MAX_LINE_COUNT and amounts_match(updated, 20100, 5427, 25527),
        f"Expected 200 lines totalling 20100/5427/25527; got {len(updated['lines'])} lines, net {updated['totalNet']}.",
        results,
    )

    last_line = updated["lines"][-1]
    status, body = client.request_json(
        "DELETE", f"{QUOTES_PATH}/{quote_id}/lines/{last_line['id']}?version={updated['version']}",
    )
    assert_status("delete-line-at-cap", status, {200}, results)
    shrunk = json.loads(body)
    assert_condition(
        "delete-frees-a-slot",
        len(shrunk["lines"]) == MAX_LINE_COUNT - 1,
        f"Expected {MAX_LINE_COUNT - 1} lines after the delete; got {len(shrunk['lines'])}.",
        results,
    )

    status, body = add_line(client, quote_id, int(shrunk["version"]), MAX_LINE_COUNT + 2)
    assert_status("add-after-delete-fits", status, {201}, results)
    refilled = json.loads(body)
    assert_condition(
        "cap-reached-again",
        len(refilled["lines"]) == MAX_LINE_COUNT,
        f"Expected {MAX_LINE_COUNT} lines after refilling; got {len(refilled['lines'])}.",
        results,
    )

    return int(refilled["version"])


def run_checks(base_url: str, origin: str, results: list[StepResult]) -> None:
    """Signs in, fills a fresh quote to the cap, asserts the next add is refused, then cleans up and signs out."""
    client, _ = sign_in_with_available_login(base_url, origin, results)
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

        assert_condition(
            "cap-totals-add-up",
            amounts_match(reread, MAX_LINE_COUNT * 100, MAX_LINE_COUNT * 27, MAX_LINE_COUNT * 127),
            f"200 lines of 100 net at 27% must total 20000/5400/25400; got {reread['totalNet']}/{reread['totalVat']}/{reread['totalGross']}.",
            results,
        )

        version = check_edits_at_cap(client, quote_id, version, reread, results)
    except Exception:
        # Best-effort cleanup only: asserting here would mask the real failure with whatever
        # the delete returns, and the version in hand may already be stale.
        client.request_json("DELETE", f"{QUOTES_PATH}/{quote_id}?version={version}")
        raise

    delete_status, _ = client.request_json("DELETE", f"{QUOTES_PATH}/{quote_id}?version={version}")
    assert_status("delete-fixture-quote", delete_status, {204}, results)
    client.request_json("POST", "/api/auth/logout")


if __name__ == "__main__":
    sys.exit(run_check(run_checks))
