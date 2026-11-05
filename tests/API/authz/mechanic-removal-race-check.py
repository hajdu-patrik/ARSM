#!/usr/bin/env python3
"""A mechanic delete (admin or self) races an unassign or unclaim of the appointment's other mechanic: one wins, the
loser answers 422, and the appointment keeps a mechanic. Each pairing is fired several times."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any, Callable

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from http_check_runner import run_check, sign_in  # noqa: E402
from http_check_support import (  # noqa: E402
    HttpClient,
    StepResult,
    assert_condition,
    read_admin_credentials,
    read_required_env,
)
from race_check_support import (  # noqa: E402
    Answers,
    Disposables,
    assert_code,
    assert_detail,
    assert_outcomes,
    create_appointment,
    create_customer,
    create_vehicle,
    race,
    register_mechanic,
)

ROUNDS = 4
DELETE_BLOCKED = "Cannot delete this mechanic because one or more appointments would be left without assigned mechanics."
LAST_MECHANIC_CODE = "last_assigned_mechanic"


class Pair:
    """The two mechanics on one appointment and the sessions that act on them."""

    def __init__(self, admin_a: HttpClient, admin_b: HttpClient, appointment_id: int) -> None:
        self.admin_a = admin_a
        self.admin_b = admin_b
        self.appointment_id = appointment_id
        self.first_id = 0
        self.second_id = 0
        self.first_session: HttpClient | None = None
        self.second_session: HttpClient | None = None
        self.password = read_required_env("ARSM_TEST_PASSWORD")


# Scenario name -> (the delete of the second mechanic, the removal of the first one).
Scenarios = dict[str, tuple[Callable[[Pair], tuple[int, str]], Callable[[Pair], tuple[int, str]]]]
SCENARIOS: Scenarios = {
    "admin-delete-vs-admin-unassign": (
        lambda p: p.admin_a.request_json("DELETE", f"/api/admin/mechanics/{p.second_id}"),
        lambda p: p.admin_b.request_json("DELETE", f"/api/appointments/{p.appointment_id}/assign/{p.first_id}"),
    ),
    "admin-delete-vs-self-unclaim": (
        lambda p: p.admin_a.request_json("DELETE", f"/api/admin/mechanics/{p.second_id}"),
        lambda p: p.first_session.request_json("DELETE", f"/api/appointments/{p.appointment_id}/claim"),
    ),
    "self-delete-vs-admin-unassign": (
        lambda p: p.second_session.request_json("DELETE", "/api/profile", {"currentPassword": p.password}),
        lambda p: p.admin_b.request_json("DELETE", f"/api/appointments/{p.appointment_id}/assign/{p.first_id}"),
    ),
    "self-delete-vs-self-unclaim": (
        lambda p: p.second_session.request_json("DELETE", "/api/profile", {"currentPassword": p.password}),
        lambda p: p.first_session.request_json("DELETE", f"/api/appointments/{p.appointment_id}/claim"),
    ),
}


def assert_loser(step: str, answers: Answers, results: list[StepResult]) -> None:
    """answers[0] is the delete, answers[1] the removal; the one that answered 422 carries its invariant message."""
    if answers[0][0] == 422:
        assert_detail(f"{step}-delete-loser-detail", [answers[0]], 422, DELETE_BLOCKED, results)
    else:
        assert_code(f"{step}-removal-loser-code", [answers[1]], 422, LAST_MECHANIC_CODE, results)


def mechanics_left(admin: HttpClient, vehicle_id: int, appointment_id: int) -> int:
    """Counts the mechanics of the appointment in the vehicle's history; -1 when the appointment is not listed."""
    _, body = admin.request_json("GET", f"/api/vehicles/{vehicle_id}/appointments")
    row = next((r for r in json.loads(body or "[]") if r.get("id") == appointment_id), None)
    return len(row["mechanics"]) if row else -1


def run_scenario(
    base_url: str, origin: str, name: str, round_index: int, context: dict[str, Any], results: list[StepResult],
) -> None:
    admin_a: HttpClient = context["admins"][0]
    step = f"{name}-{round_index}"
    first, first_id = register_mechanic(admin_a, context["disposables"], "Removalone", f"{step}-register-first", results)
    second, second_id = register_mechanic(admin_a, context["disposables"], "Removaltwo", f"{step}-register-second", results)
    appointment = create_appointment(
        admin_a, context["customer"], context["vehicle"], [first_id, second_id], f"{step}-appointment", results,
    )
    pair = Pair(admin_a, context["admins"][1], appointment["id"])
    pair.first_id, pair.second_id = first_id, second_id
    # Only the sessions a scenario acts through log in, which keeps the check far below the login limit.
    if name.endswith("self-unclaim"):
        pair.first_session, _ = sign_in(base_url, origin, first, f"{step}-login-first", results)
    if name.startswith("self-delete"):
        pair.second_session, _ = sign_in(base_url, origin, second, f"{step}-login-second", results)

    delete_call, removal_call = SCENARIOS[name]
    answers = race([lambda: delete_call(pair), lambda: removal_call(pair)])
    assert_outcomes(step, answers, [200, 422], results)
    assert_loser(step, answers, results)
    left = mechanics_left(admin_a, context["vehicle"], appointment["id"])
    assert_condition(f"{step}-appointment-keeps-a-mechanic", left == 1, f"{left} mechanics are left on the appointment.", results)

    admin_a.request_json("DELETE", f"/api/appointments/{appointment['id']}")
    for person_id in (first_id, second_id):
        admin_a.request_json("DELETE", f"/api/admin/mechanics/{person_id}")


def run_checks(base_url: str, origin: str, results: list[StepResult]) -> None:
    credentials = read_admin_credentials()
    first, _ = sign_in(base_url, origin, credentials, "login-first-session", results)
    second, _ = sign_in(base_url, origin, credentials, "login-second-session", results)
    disposables = Disposables(first)
    try:
        customer = create_customer(first, disposables, "Removalrace", "removal-race-customer", results)
        context = {
            "admins": [first, second],
            "disposables": disposables,
            "customer": customer,
            "vehicle": create_vehicle(first, customer, "removal-race-vehicle", results)["id"],
        }
        for name in SCENARIOS:
            for round_index in range(ROUNDS):
                run_scenario(base_url, origin, name, round_index, context, results)
    finally:
        second.request_json("POST", "/api/auth/logout")
        disposables.close()


if __name__ == "__main__":
    sys.exit(run_check(run_checks))
