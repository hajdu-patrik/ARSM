#!/usr/bin/env python3
"""Checks quote numbers stay unique when quotes are created at the same moment (D13), which httpyac cannot do in parallel."""

from __future__ import annotations

import json
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
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

# QuoteNumberGenerator retries five times, so up to four simultaneous creates always fit
# (a create loses at most once to every other create); more would test luck, not the rule.
PARALLEL_CREATES = 4
QUOTE_NUMBER_PATTERN = re.compile(r"^ARSM-(\d{4})-(\d{4,})$")


def create_quote(client: HttpClient, vehicle_id: int, ordinal: int) -> tuple[int, str]:
    """Creates one draft quote; the title carries the ordinal so a leftover is easy to spot."""
    return client.request_json(
        "POST",
        f"{VEHICLES_PATH}/{vehicle_id}/quotes",
        {"title": f"Quote number fixture {int(time.time())}-{ordinal}"},
    )


def delete_quotes(client: HttpClient, quotes: list[dict]) -> list[int]:
    """Deletes the disposable drafts and returns every delete status, so the caller can assert them."""
    return [
        client.request_json("DELETE", f"{QUOTES_PATH}/{quote['id']}?version={quote['version']}")[0]
        for quote in quotes
    ]


def run_checks(base_url: str, origin: str, results: list[StepResult]) -> None:
    """Creates quotes in parallel on the anchor vehicle, asserts unique well-formed numbers and deletes them."""
    client, _ = sign_in_with_available_login(base_url, origin, results)
    vehicle_id = int(find_anchor_quote(client, results)["vehicleId"])

    with ThreadPoolExecutor(max_workers=PARALLEL_CREATES) as pool:
        answers = list(pool.map(lambda ordinal: create_quote(client, vehicle_id, ordinal), range(PARALLEL_CREATES)))

    created = [json.loads(body) for status, body in answers if status == 201]
    try:
        assert_condition(
            "parallel-creates-all-succeed",
            len(created) == PARALLEL_CREATES,
            f"Expected {PARALLEL_CREATES} created quotes; statuses were {[status for status, _ in answers]}.",
            results,
        )

        numbers = [str(quote["quoteNumber"]) for quote in created]
        assert_condition(
            "quote-numbers-unique",
            len(set(numbers)) == PARALLEL_CREATES,
            f"Simultaneous creates produced duplicate quote numbers: {sorted(numbers)}.",
            results,
        )

        year = datetime.now(timezone.utc).year
        matches = [QUOTE_NUMBER_PATTERN.match(number) for number in numbers]
        assert_condition(
            "quote-numbers-well-formed",
            all(match is not None and int(match.group(1)) == year for match in matches),
            f"Every number must read ARSM-{year}-NNNN; got {sorted(numbers)}.",
            results,
        )

        sequences = sorted(int(match.group(2)) for match in matches if match is not None)
        assert_condition(
            "quote-numbers-follow-each-other",
            sequences == list(range(sequences[0], sequences[0] + PARALLEL_CREATES)),
            f"The numbers of one burst must be consecutive; got {sequences}.",
            results,
        )
    finally:
        delete_statuses = delete_quotes(client, created)

    assert_condition(
        "delete-fixture-quotes",
        all(status == 204 for status in delete_statuses),
        f"Every disposable draft must delete with 204; got {delete_statuses}.",
        results,
    )

    status, _ = client.request_json("GET", f"{QUOTES_PATH}/{created[0]['id']}")
    assert_status("deleted-quote-is-gone", status, {404}, results)
    client.request_json("POST", "/api/auth/logout")


if __name__ == "__main__":
    sys.exit(run_check(run_checks))
