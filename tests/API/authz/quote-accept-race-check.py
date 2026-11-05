#!/usr/bin/env python3
"""Two sessions Accept two Sent sibling quotes of one InProgress appointment at once: one answers 200, the other 409
quote_locked_appointment_accepted, and exactly one quote ends Accepted. The pair is fired several times."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from http_check_runner import run_check, sign_in  # noqa: E402
from http_check_support import HttpClient, StepResult, assert_condition, assert_status, read_admin_credentials  # noqa: E402
from race_check_support import (  # noqa: E402
    ROUNDS,
    Disposables,
    assert_code,
    assert_outcomes,
    body_of,
    create_appointment,
    create_customer,
    create_sent_quote,
    create_vehicle,
    find_fixture_part_id,
    race,
)

LOCKED_CODE = "quote_locked_appointment_accepted"


def accepted_count(admin: HttpClient, quote_ids: list[int], step: str, results: list[StepResult]) -> int:
    count = 0
    for quote_id in quote_ids:
        status, body = admin.request_json("GET", f"/api/quotes/{quote_id}")
        assert_status(f"{step}-read-{quote_id}", status, {200}, results)
        count += 1 if body_of(body).get("status") == "Accepted" else 0
    return count


def run_checks(base_url: str, origin: str, results: list[StepResult]) -> None:
    first, login = sign_in(base_url, origin, read_admin_credentials(), "login-first-session", results)
    second, _ = sign_in(base_url, origin, read_admin_credentials(), "login-second-session", results)
    disposables = Disposables(first)
    try:
        part_id = find_fixture_part_id(first, results)
        customer = create_customer(first, disposables, "Acceptrace", "accept-race-customer", results)
        vehicle = create_vehicle(first, customer, "accept-race-vehicle", results)["id"]
        for round_index in range(ROUNDS):
            appointment = create_appointment(
                first, customer, vehicle, [int(login["personId"])], f"accept-race-appointment-{round_index}", results,
            )
            quotes = [
                create_sent_quote(first, vehicle, appointment["id"], part_id, f"accept-race-quote-{round_index}-{index}", results)
                for index in range(2)
            ]
            answers = race(
                [
                    lambda quote=quote, client=client: client.request_json(
                        "POST", f"/api/quotes/{quote['id']}/status", {"status": "Accepted", "version": quote["version"]},
                    )
                    for quote, client in zip(quotes, (first, second))
                ],
            )
            assert_outcomes(f"accept-race-{round_index}", answers, [200, 409], results)
            assert_code(f"accept-race-loser-code-{round_index}", answers, 409, LOCKED_CODE, results)
            accepted = accepted_count(first, [quote["id"] for quote in quotes], f"accept-race-{round_index}", results)
            assert_condition(f"accept-race-one-accepted-{round_index}", accepted == 1, f"{accepted} quotes ended Accepted.", results)
    finally:
        second.request_json("POST", "/api/auth/logout")
        disposables.close()


if __name__ == "__main__":
    sys.exit(run_check(run_checks))
