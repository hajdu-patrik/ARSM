#!/usr/bin/env python3
"""Two sessions race the customer and vehicle writes: a taken e-mail, plate or VIN, an edit against a delete and a double delete of a customer or vehicle, answer
the sequential 409 or 404, never a 500. Races are timing-bound, so each pair is fired several times."""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any, Callable

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from http_check_runner import run_check, sign_in  # noqa: E402
from http_check_support import HttpClient, StepResult, assert_condition, assert_status, read_admin_credentials  # noqa: E402
from race_check_support import (  # noqa: E402
    ROUNDS,
    Disposables,
    assert_detail,
    assert_outcomes,
    body_of,
    create_customer,
    create_vehicle,
    race,
    race_requests,
    unique_plate,
    unique_tag,
    unique_vin,
    vehicle_payload,
    winner_body,
)

EMAIL_TAKEN = "A person with this email already exists."
PLATE_TAKEN = "A vehicle with this license plate already exists."
VIN_TAKEN = "A vehicle with this VIN already exists."


def customer_body(label: str, email: str) -> dict[str, Any]:
    return {"firstName": "Race", "middleName": None, "lastName": label, "email": email, "phoneNumber": None}


def check_customer_create(clients: list[HttpClient], disposables: Disposables, results: list[StepResult]) -> None:
    for round_index in range(ROUNDS):
        payload = customer_body("Dupcreate", f"race.dupcreate.{unique_tag()}@example.test")
        answers = race_requests(clients, "POST", ["/api/customers"] * 2, [payload, payload])
        assert_outcomes(f"customer-create-race-{round_index}", answers, [201, 409], results)
        assert_detail(f"customer-create-race-detail-{round_index}", answers, 409, EMAIL_TAKEN, results)
        disposables.customer(int(winner_body(answers, 201)["id"]))


def check_customer_update(clients: list[HttpClient], disposables: Disposables, results: list[StepResult]) -> None:
    admin = clients[0]
    for round_index in range(ROUNDS):
        first = create_customer(admin, disposables, "Dupupone", f"customer-update-setup-a-{round_index}", results)
        second = create_customer(admin, disposables, "Dupuptwo", f"customer-update-setup-b-{round_index}", results)
        payload = customer_body("Dupupdate", f"race.dupupdate.{unique_tag()}@example.test")
        answers = race_requests(clients, "PUT", [f"/api/customers/{first}", f"/api/customers/{second}"], [payload, payload])
        assert_outcomes(f"customer-update-race-{round_index}", answers, [204, 409], results)
        assert_detail(f"customer-update-race-detail-{round_index}", answers, 409, EMAIL_TAKEN, results)


def check_customer_double_delete(clients: list[HttpClient], disposables: Disposables, results: list[StepResult]) -> None:
    """Two deletes of one customer: the loser answers the sequential 404, not the 500 of a lost concurrency check."""
    for round_index in range(ROUNDS):
        customer_id = create_customer(clients[0], disposables, "Doubledelete", f"customer-double-delete-setup-{round_index}", results)
        path = f"/api/customers/{customer_id}"
        answers = race_requests(clients, "DELETE", [path] * 2, [None, None])
        assert_outcomes(f"customer-double-delete-race-{round_index}", answers, [204, 404], results)
        assert_detail(f"customer-double-delete-detail-{round_index}", answers, 404, "Customer not found.", results)


def check_vehicle_double_delete(clients: list[HttpClient], disposables: Disposables, results: list[StepResult]) -> None:
    """Two deletes of one vehicle: the loser answers the sequential 404, not the 500 of a lost concurrency check."""
    owner = create_customer(clients[0], disposables, "Vehdoubledelete", "vehicle-double-delete-owner", results)
    for round_index in range(ROUNDS):
        vehicle_id = create_vehicle(clients[0], owner, f"vehicle-double-delete-setup-{round_index}", results)["id"]
        path = f"/api/vehicles/{vehicle_id}"
        answers = race_requests(clients, "DELETE", [path] * 2, [None, None])
        assert_outcomes(f"vehicle-double-delete-race-{round_index}", answers, [204, 404], results)
        assert_detail(f"vehicle-double-delete-detail-{round_index}", answers, 404, "Vehicle not found.", results)


def check_vehicle_create(clients: list[HttpClient], disposables: Disposables, results: list[StepResult]) -> None:
    customer_id = create_customer(clients[0], disposables, "Dupvehicle", "vehicle-create-setup", results)
    paths = [f"/api/customers/{customer_id}/vehicles"] * 2
    for round_index in range(ROUNDS):
        plate, vin = unique_plate(), unique_vin()
        answers = race_requests(
            clients, "POST", paths, [vehicle_payload(plate, unique_vin()), vehicle_payload(plate, unique_vin())],
        )
        assert_outcomes(f"vehicle-create-plate-race-{round_index}", answers, [201, 409], results)
        assert_detail(f"vehicle-create-plate-race-detail-{round_index}", answers, 409, PLATE_TAKEN, results)

        answers = race_requests(
            clients, "POST", paths, [vehicle_payload(unique_plate(), vin), vehicle_payload(unique_plate(), vin)],
        )
        assert_outcomes(f"vehicle-create-vin-race-{round_index}", answers, [201, 409], results)
        assert_detail(f"vehicle-create-vin-race-detail-{round_index}", answers, 409, VIN_TAKEN, results)


def check_vehicle_update(clients: list[HttpClient], disposables: Disposables, results: list[StepResult]) -> None:
    customer_id = create_customer(clients[0], disposables, "Dupvehicleup", "vehicle-update-setup", results)
    first = create_vehicle(clients[0], customer_id, "vehicle-update-setup-a", results)["id"]
    second = create_vehicle(clients[0], customer_id, "vehicle-update-setup-b", results)["id"]
    paths = [f"/api/vehicles/{first}", f"/api/vehicles/{second}"]
    for round_index in range(ROUNDS):
        plate, vin = unique_plate(), unique_vin()
        answers = race_requests(
            clients, "PUT", paths, [vehicle_payload(plate, unique_vin()), vehicle_payload(plate, unique_vin())],
        )
        assert_outcomes(f"vehicle-update-plate-race-{round_index}", answers, [204, 409], results)
        assert_detail(f"vehicle-update-plate-race-detail-{round_index}", answers, 409, PLATE_TAKEN, results)

        answers = race_requests(
            clients, "PUT", paths, [vehicle_payload(unique_plate(), vin), vehicle_payload(unique_plate(), vin)],
        )
        assert_outcomes(f"vehicle-update-vin-race-{round_index}", answers, [204, 409], results)
        assert_detail(f"vehicle-update-vin-race-detail-{round_index}", answers, 409, VIN_TAKEN, results)


def check_edit_against_delete(
    clients: list[HttpClient],
    results: list[StepResult],
    step: str,
    make_target: Callable[[int], int],
    path_of: Callable[[int], str],
    payload_of: Callable[[], dict[str, Any]],
    gone_detail: str,
) -> None:
    """The delete wins; an edit that lost answers the sequential 404, and the target is gone afterwards."""
    for round_index in range(ROUNDS):
        path = path_of(make_target(round_index))
        answers = race(
            [lambda: clients[0].request_json("PUT", path, payload_of()), lambda: clients[1].request_json("DELETE", path)],
            [0.0, 0.004 * round_index],
        )
        edit_status, edit_body = answers[0]
        delete_status = answers[1][0]
        assert_condition(f"{step}-edit-answer-{round_index}", edit_status in {204, 404}, f"Edit answered {edit_status}.", results)
        assert_condition(f"{step}-delete-answer-{round_index}", delete_status == 204, f"Delete answered {delete_status}.", results)
        if edit_status == 404:
            detail = body_of(edit_body).get("detail")
            assert_condition(f"{step}-edit-lost-detail-{round_index}", detail == gone_detail, f"detail was {detail!r}.", results)
        status, _ = clients[0].request_json("GET", path)
        assert_status(f"{step}-gone-afterwards-{round_index}", status, {404}, results)


def run_checks(base_url: str, origin: str, results: list[StepResult]) -> None:
    first, _ = sign_in(base_url, origin, read_admin_credentials(), "login-first-session", results)
    second, _ = sign_in(base_url, origin, read_admin_credentials(), "login-second-session", results)
    clients = [first, second]
    disposables = Disposables(first)

    def make_customer(round_index: int) -> int:
        return create_customer(first, disposables, "Editdelete", f"customer-delete-setup-{round_index}", results)

    def make_vehicle(round_index: int) -> int:
        owner = create_customer(first, disposables, "Vehdelete", f"vehicle-delete-setup-{round_index}", results)
        return int(create_vehicle(first, owner, f"vehicle-delete-vehicle-{round_index}", results)["id"])

    try:
        check_customer_create(clients, disposables, results)
        check_customer_update(clients, disposables, results)
        check_customer_double_delete(clients, disposables, results)
        check_vehicle_double_delete(clients, disposables, results)
        check_vehicle_create(clients, disposables, results)
        check_vehicle_update(clients, disposables, results)
        check_edit_against_delete(
            clients, results, "customer", make_customer, lambda target: f"/api/customers/{target}",
            lambda: customer_body("Editdelete", f"race.editdelete.{unique_tag()}@example.test"), "Customer not found.",
        )
        check_edit_against_delete(
            clients, results, "vehicle", make_vehicle, lambda target: f"/api/vehicles/{target}",
            lambda: vehicle_payload(unique_plate(), unique_vin()), "Vehicle not found.",
        )
    finally:
        second.request_json("POST", "/api/auth/logout")
        disposables.close()


if __name__ == "__main__":
    sys.exit(run_check(run_checks))
