#!/usr/bin/env python3
"""Shared pieces of the parallel-write race checks: barrier-started racers, outcome assertions and disposable fixtures."""

from __future__ import annotations

import json
import sys
import threading
import time
import uuid
from pathlib import Path
from typing import Any, Callable

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from http_check_support import (  # noqa: E402
    Credentials,
    HttpClient,
    StepResult,
    assert_condition,
    assert_status,
    read_required_env,
)

ROUNDS = 6
FIXTURE_PART_NUMBER = "OLF-1001"
Call = Callable[[], tuple[int, str]]
Answers = list[tuple[int, str]]


def unique_tag() -> str:
    """Returns ten run-unique hex characters for keys, e-mail addresses and plates."""
    return uuid.uuid4().hex[:10]


def race(calls: list[Call], offsets: list[float] | None = None) -> Answers:
    """Runs the calls on threads released by one barrier; offsets delay a call to land inside another one's window."""
    barrier = threading.Barrier(len(calls))
    answers: Answers = [(0, "")] * len(calls)

    def fire(index: int) -> None:
        barrier.wait()
        if offsets and offsets[index] > 0:
            time.sleep(offsets[index])
        answers[index] = calls[index]()

    threads = [threading.Thread(target=fire, args=(index,)) for index in range(len(calls))]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()
    return answers


def race_same(clients: list[HttpClient], request: Callable[[HttpClient], tuple[int, str]]) -> Answers:
    """Sends the same request from every session at once."""
    return race([lambda client=client: request(client) for client in clients])


def race_requests(clients: list[HttpClient], method: str, paths: list[str], bodies: list[Any]) -> Answers:
    """Session i sends bodies[i] to paths[i] at the same moment as the others."""
    return race([lambda i=i: clients[i].request_json(method, paths[i], bodies[i]) for i in range(len(clients))])


def body_of(body: str) -> dict[str, Any]:
    """Parses a JSON object body; an empty or non-object body reads as an empty object."""
    try:
        parsed = json.loads(body) if body else {}
    except ValueError:
        return {}
    return parsed if isinstance(parsed, dict) else {}


def assert_outcomes(step: str, answers: Answers, expected: list[int], results: list[StepResult]) -> None:
    """The sorted statuses must be exactly the expected ones (one winner, one sequential loser, never a 500)."""
    statuses = sorted(status for status, _ in answers)
    assert_condition(step, statuses == sorted(expected), f"Expected {sorted(expected)}, got {statuses}.", results)


def winner_body(answers: Answers, status: int) -> dict[str, Any]:
    """Returns the parsed body of the answer with the given status."""
    return body_of(next(body for answered, body in answers if answered == status))


def assert_detail(step: str, answers: Answers, status: int, detail: str, results: list[StepResult]) -> None:
    """The answer with the given status must carry the sequential ProblemDetails detail."""
    actual = winner_body(answers, status).get("detail")
    assert_condition(step, actual == detail, f"Expected detail {detail!r}, got {actual!r}.", results)


def assert_code(step: str, answers: Answers, status: int, code: str, results: list[StepResult]) -> None:
    """The answer with the given status must carry the stable error code."""
    actual = winner_body(answers, status).get("code")
    assert_condition(step, actual == code, f"Expected code {code!r}, got {actual!r}.", results)


class Disposables:
    """Tracks what a check created and deletes it as the admin at the end (customers first, their cascades free the rest)."""

    def __init__(self, admin: HttpClient) -> None:
        self.admin = admin
        self.customers: list[str] = []
        self.others: list[str] = []

    def customer(self, customer_id: int) -> None:
        self.customers.append(f"/api/customers/{customer_id}")

    def other(self, path: str) -> None:
        self.others.append(path)

    def close(self) -> None:
        """Best effort, so the failure that ended the check stays the one reported."""
        for path in [*self.customers, *reversed(self.others)]:
            self.admin.request_json("DELETE", path)
        self.admin.request_json("POST", "/api/auth/logout")


def create_customer(admin: HttpClient, disposables: Disposables, label: str, step: str, results: list[StepResult]) -> int:
    """Creates a disposable customer on a run-unique @example.test address."""
    payload = {
        "firstName": "Race", "middleName": None, "lastName": label,
        "email": f"race.{label.lower()}.{unique_tag()}@example.test", "phoneNumber": None,
    }
    status, body = admin.request_json("POST", "/api/customers", payload)
    assert_status(step, status, {201}, results)
    customer_id = int(json.loads(body)["id"])
    disposables.customer(customer_id)
    return customer_id


def vehicle_payload(plate: str, vin: str) -> dict[str, Any]:
    """The vehicle body shared by create, update and the appointment vehicle edit."""
    return {
        "licensePlate": plate, "vin": vin, "brand": "Skoda", "model": "Octavia", "year": 2020,
        "mileageKm": 45000, "enginePowerKw": 110, "drivetrainType": "Petrol",
    }


def unique_plate() -> str:
    """A valid run-unique plate (the leading digit keeps the 'at least one digit' rule satisfied)."""
    return f"R1-{unique_tag().upper()}"


def unique_vin() -> str:
    """A valid run-unique VIN: 17 characters from the hex digits and the letters R, C, E."""
    return f"RCE{uuid.uuid4().hex[:14].upper()}"


def create_vehicle(admin: HttpClient, customer_id: int, step: str, results: list[StepResult]) -> dict[str, Any]:
    """Creates a vehicle with a run-unique plate and VIN on the customer."""
    status, body = admin.request_json(
        "POST", f"/api/customers/{customer_id}/vehicles", vehicle_payload(unique_plate(), unique_vin()),
    )
    assert_status(step, status, {201}, results)
    return json.loads(body)


def create_appointment(
    admin: HttpClient, customer_id: int, vehicle_id: int, mechanic_ids: list[int], step: str, results: list[StepResult],
) -> dict[str, Any]:
    """Creates an InProgress appointment with the given mechanics."""
    status, body = admin.request_json(
        "POST",
        f"/api/customers/{customer_id}/appointments",
        {
            "vehicleId": vehicle_id,
            "scheduledDate": "2031-03-10T09:00:00",
            "taskDescription": "Parallel write race fixture",
            "mechanicIds": mechanic_ids,
        },
    )
    assert_status(step, status, {201}, results)
    return json.loads(body)


def register_mechanic(
    admin: HttpClient, disposables: Disposables, label: str, step: str, results: list[StepResult],
) -> tuple[Credentials, int]:
    """Registers a disposable mechanic (prefix race.mechanic., known to the purge suite)."""
    password = read_required_env("ARSM_TEST_PASSWORD")
    email = f"race.mechanic.{label}.{unique_tag()}@example.test"
    status, body = admin.request_json(
        "POST",
        "/api/auth/register",
        {
            "firstName": "Race", "lastName": label, "email": email, "password": password,
            "personType": "Mechanic", "specialization": "GasolineAndDiesel", "expertise": ["Engine"],
        },
    )
    assert_status(step, status, {200}, results)
    person_id = int(json.loads(body)["personId"])
    disposables.other(f"/api/admin/mechanics/{person_id}")
    return Credentials(email, password), person_id


def find_fixture_part_id(admin: HttpClient, results: list[StepResult]) -> int:
    """Returns the id of the shared catalog part OLF-1001 that the _setup suite creates."""
    status, body = admin.request_json("GET", f"/api/parts?search={FIXTURE_PART_NUMBER}&pageSize=500")
    assert_status("list-fixture-part", status, {200}, results)
    part = next((p for p in body_of(body).get("items", []) if p.get("partNumber") == FIXTURE_PART_NUMBER), None)
    assert_condition("fixture-part-available", part is not None, "The fixture part is missing; run tests/API/_setup first.", results)
    assert part is not None
    return int(part["id"])


def create_sent_quote(
    admin: HttpClient, vehicle_id: int, appointment_id: int, part_id: int, step: str, results: list[StepResult],
) -> dict[str, Any]:
    """Creates a quote linked to the appointment, adds the catalog part line and sends it; returns the Sent detail."""
    status, body = admin.request_json(
        "POST", f"/api/vehicles/{vehicle_id}/quotes", {"title": f"Race quote {unique_tag()}", "appointmentId": appointment_id},
    )
    assert_status(f"{step}-create", status, {201}, results)
    quote = json.loads(body)
    status, body = admin.request_json(
        "POST",
        f"/api/quotes/{quote['id']}/lines",
        {"lineKind": "Part", "quantity": 1, "partId": part_id, "version": quote["version"]},
    )
    assert_status(f"{step}-line", status, {201}, results)
    status, body = admin.request_json(
        "POST", f"/api/quotes/{quote['id']}/status", {"status": "Sent", "version": json.loads(body)["version"]},
    )
    assert_status(f"{step}-send", status, {200}, results)
    return json.loads(body)
