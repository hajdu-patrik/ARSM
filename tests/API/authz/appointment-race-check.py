#!/usr/bin/env python3
"""Sessions race appointment writes: a double delete, a claim or admin assign against a delete, a vehicle edit against
a vehicle delete and a plate or VIN rename taken twice answer the sequential 404 or 409, never a 500."""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from http_check_runner import run_check, sign_in  # noqa: E402
from http_check_support import HttpClient, StepResult, assert_condition, assert_status, read_admin_credentials  # noqa: E402
from race_check_support import (  # noqa: E402
    ROUNDS,
    Answers,
    Disposables,
    assert_code,
    assert_detail,
    assert_outcomes,
    create_appointment,
    create_customer,
    create_vehicle,
    race,
    race_requests,
    register_mechanic,
    unique_plate,
    unique_vin,
    vehicle_payload,
)

PLATE_TAKEN = "A vehicle with this license plate already exists."
VIN_TAKEN = "A vehicle with this VIN already exists."
NOT_FOUND_CODE = "appointment_not_found"


def check_double_delete(clients: list[HttpClient], fixture: dict[str, Any], results: list[StepResult]) -> None:
    for round_index in range(ROUNDS):
        appointment = new_appointment(clients[0], fixture, f"double-delete-setup-{round_index}", results)
        path = f"/api/appointments/{appointment['id']}"
        answers = race_requests(clients, "DELETE", [path] * 2, [None, None])
        assert_outcomes(f"appointment-double-delete-race-{round_index}", answers, [204, 404], results)
        assert_code(f"appointment-double-delete-code-{round_index}", answers, 404, NOT_FOUND_CODE, results)


def new_appointment(admin: HttpClient, fixture: dict[str, Any], step: str, results: list[StepResult]) -> dict[str, Any]:
    return create_appointment(admin, fixture["customer"], fixture["vehicle"], [fixture["admin"]], step, results)


def assert_edit_lost_to_delete(
    step: str, answers: Answers, edit_ok: int, results: list[StepResult],
) -> None:
    """answers[1] is the delete (204); answers[0] either succeeded first or lost with the sequential 404 code."""
    assert_condition(f"{step}-delete-answer", answers[1][0] == 204, f"Delete answered {answers[1][0]}.", results)
    assert_condition(f"{step}-edit-answer", answers[0][0] in {edit_ok, 404}, f"Edit answered {answers[0][0]}.", results)
    if answers[0][0] == 404:
        assert_code(f"{step}-edit-lost-code", [answers[0]], 404, NOT_FOUND_CODE, results)


def check_assignment_against_delete(
    clients: list[HttpClient], fixture: dict[str, Any], mechanic_client: HttpClient, mechanic_id: int, results: list[StepResult],
) -> None:
    """The mechanic claims, or the admin assigns the mechanic, while another admin session deletes the appointment."""
    for round_index in range(ROUNDS):
        for kind, request in (
            ("claim", lambda path: mechanic_client.request_json("PUT", f"{path}/claim")),
            ("assign", lambda path: clients[0].request_json("PUT", f"{path}/assign/{mechanic_id}")),
        ):
            appointment = new_appointment(clients[0], fixture, f"{kind}-delete-setup-{round_index}", results)
            path = f"/api/appointments/{appointment['id']}"
            answers = race(
                [lambda: request(path), lambda: clients[1].request_json("DELETE", path)], [0.0, 0.004 * round_index],
            )
            assert_edit_lost_to_delete(f"appointment-{kind}-vs-delete-{round_index}", answers, 200, results)


def check_vehicle_rename(clients: list[HttpClient], admin_id: int, disposables: Disposables, results: list[StepResult]) -> None:
    """Two appointments of two vehicles rename their vehicle to the same plate, then to the same VIN."""
    admin = clients[0]
    customer = create_customer(admin, disposables, "Renamerace", "rename-setup", results)
    paths = []
    for index in range(2):
        vehicle = create_vehicle(admin, customer, f"rename-vehicle-{index}", results)
        appointment = create_appointment(admin, customer, vehicle["id"], [admin_id], f"rename-appointment-{index}", results)
        paths.append(f"/api/appointments/{appointment['id']}/vehicle")
    for round_index in range(ROUNDS):
        plate, vin = unique_plate(), unique_vin()
        answers = race_requests(
            clients, "PUT", paths, [vehicle_payload(plate, unique_vin()), vehicle_payload(plate, unique_vin())],
        )
        assert_outcomes(f"appointment-vehicle-plate-race-{round_index}", answers, [200, 409], results)
        assert_detail(f"appointment-vehicle-plate-race-detail-{round_index}", answers, 409, PLATE_TAKEN, results)

        answers = race_requests(
            clients, "PUT", paths, [vehicle_payload(unique_plate(), vin), vehicle_payload(unique_plate(), vin)],
        )
        assert_outcomes(f"appointment-vehicle-vin-race-{round_index}", answers, [200, 409], results)
        assert_detail(f"appointment-vehicle-vin-race-detail-{round_index}", answers, 409, VIN_TAKEN, results)


def check_vehicle_edit_against_vehicle_delete(
    clients: list[HttpClient], admin_id: int, disposables: Disposables, results: list[StepResult],
) -> None:
    """The vehicle delete cascades the appointment, so a parallel appointment vehicle edit answers 200 or 404."""
    admin = clients[0]
    customer = create_customer(admin, disposables, "Vehicleedit", "vehicle-edit-setup", results)
    for round_index in range(ROUNDS):
        vehicle = create_vehicle(admin, customer, f"vehicle-edit-vehicle-{round_index}", results)
        appointment = create_appointment(admin, customer, vehicle["id"], [admin_id], f"vehicle-edit-appointment-{round_index}", results)
        edit_path = f"/api/appointments/{appointment['id']}/vehicle"
        answers = race(
            [
                lambda: clients[0].request_json("PUT", edit_path, vehicle_payload(unique_plate(), unique_vin())),
                lambda: clients[1].request_json("DELETE", f"/api/vehicles/{vehicle['id']}"),
            ],
            [0.0, 0.004 * round_index],
        )
        assert_edit_lost_to_delete(f"appointment-vehicle-edit-vs-vehicle-delete-{round_index}", answers, 200, results)
        status, _ = admin.request_json("GET", f"/api/vehicles/{vehicle['id']}")
        assert_status(f"vehicle-gone-afterwards-{round_index}", status, {404}, results)


def run_checks(base_url: str, origin: str, results: list[StepResult]) -> None:
    first, login = sign_in(base_url, origin, read_admin_credentials(), "login-first-session", results)
    second, _ = sign_in(base_url, origin, read_admin_credentials(), "login-second-session", results)
    clients = [first, second]
    admin_id = int(login["personId"])
    disposables = Disposables(first)
    try:
        customer = create_customer(first, disposables, "Appointmentrace", "appointment-race-setup", results)
        fixture = {"customer": customer, "vehicle": create_vehicle(first, customer, "appointment-race-vehicle", results)["id"], "admin": admin_id}
        credentials, mechanic_id = register_mechanic(first, disposables, "Claimer", "register-claimer", results)
        mechanic_client, _ = sign_in(base_url, origin, credentials, "login-claimer", results)

        check_double_delete(clients, fixture, results)
        check_assignment_against_delete(clients, fixture, mechanic_client, mechanic_id, results)
        check_vehicle_rename(clients, admin_id, disposables, results)
        check_vehicle_edit_against_vehicle_delete(clients, admin_id, disposables, results)
        mechanic_client.request_json("POST", "/api/auth/logout")
    finally:
        second.request_json("POST", "/api/auth/logout")
        disposables.close()


if __name__ == "__main__":
    sys.exit(run_check(run_checks))
