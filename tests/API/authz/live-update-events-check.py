#!/usr/bin/env python3
"""Checks that GET /api/appointments/updates pushes one camelCase appointment-updated event per affected appointment
after a quote Accept, a customer delete, a vehicle delete, an admin mechanic delete and a self profile delete."""

from __future__ import annotations

import importlib.util
import sys
import time
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from http_check_runner import run_check, sign_in  # noqa: E402
from http_check_support import HttpClient, StepResult, assert_condition, assert_status, read_admin_credentials  # noqa: E402
from race_check_support import (  # noqa: E402
    Disposables,
    create_appointment,
    create_customer,
    create_sent_quote,
    create_vehicle,
    find_fixture_part_id,
    register_mechanic,
)

SETTLE_SECONDS = 0.5
QUIET_SECONDS = 1.0
OCCURRED_AT_TOLERANCE_MS = 120_000


def load_stream_module() -> Any:
    """Loads the SSE reader of appointments/appointment-updates-check.py (the file name is not importable)."""
    path = Path(__file__).resolve().parents[1] / "appointments" / "appointment-updates-check.py"
    spec = importlib.util.spec_from_file_location("appointment_updates_check", path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class Watcher:
    """The open event stream plus the bookkeeping that tells setup events from the ones an action causes."""

    def __init__(self, stream: Any, collector: Any, results: list[StepResult]) -> None:
        self.stream = stream
        self.collector = collector
        self.results = results
        self.seen = 0

    def settle(self, step: str, setup_events: int) -> int:
        """Waits until every setup event so far has arrived, lets stragglers land, and returns the index the action starts at."""
        self.seen += setup_events
        arrived = self.collector.wait_until(lambda: len(self.collector.events) >= self.seen, self.stream.EVENT_WAIT_SECONDS)
        assert_condition(f"{step}-setup-events", arrived, f"Fewer than {self.seen} events reached the subscriber.", self.results)
        time.sleep(SETTLE_SECONDS)
        self.seen = len(self.collector.events)
        return self.seen

    def expect(self, step: str, mark: int, appointment_ids: list[int]) -> None:
        """Exactly one well-formed event per expected appointment id arrived after the mark, and nothing else."""
        wanted = len(appointment_ids)
        arrived = self.collector.wait_until(lambda: len(self.collector.events) >= mark + wanted, self.stream.EVENT_WAIT_SECONDS)
        assert_condition(f"{step}-events-received", arrived, f"Expected {wanted} events after the action.", self.results)
        time.sleep(QUIET_SECONDS)
        events = self.collector.events[mark:]
        assert_condition(f"{step}-event-count", len(events) == wanted, f"Expected {wanted} events, got {len(events)}.", self.results)
        for name, payload in events:
            assert_condition(f"{step}-event-name", name == self.stream.SSE_EVENT_NAME, f"Event name {name!r}.", self.results)
            assert_condition(
                f"{step}-payload-is-camel-case",
                set(payload) == self.stream.EXPECTED_PAYLOAD_KEYS,
                f"Payload keys were {sorted(payload)}.",
                self.results,
            )
            drift = abs(int(time.time() * 1000) - payload["occurredAt"])
            assert_condition(f"{step}-occurred-at", drift < OCCURRED_AT_TOLERANCE_MS, f"occurredAt drifted {drift} ms.", self.results)
        self.seen = len(self.collector.events)
        ids = sorted(payload["appointmentId"] for _, payload in events)
        assert_condition(f"{step}-appointment-ids", ids == sorted(appointment_ids), f"Got {ids}, wanted {sorted(appointment_ids)}.", self.results)


def appointments_on(admin: HttpClient, customer: int, vehicle: int, mechanic_ids: list[int], count: int, step: str, results: list[StepResult]) -> list[int]:
    return [create_appointment(admin, customer, vehicle, mechanic_ids, f"{step}-{index}", results)["id"] for index in range(count)]


def check_quote_accept(watcher: Watcher, admin: HttpClient, admin_id: int, disposables: Disposables, results: list[StepResult]) -> None:
    customer = create_customer(admin, disposables, "Eventaccept", "accept-customer", results)
    vehicle = create_vehicle(admin, customer, "accept-vehicle", results)["id"]
    appointment = appointments_on(admin, customer, vehicle, [admin_id], 1, "accept-appointment", results)[0]
    quote = create_sent_quote(admin, vehicle, appointment, find_fixture_part_id(admin, results), "accept-quote", results)
    mark = watcher.settle("quote-accept", 1)
    status, _ = admin.request_json("POST", f"/api/quotes/{quote['id']}/status", {"status": "Accepted", "version": quote["version"]})
    assert_status("quote-accept", status, {200}, results)
    watcher.expect("quote-accept", mark, [appointment])


def check_customer_and_vehicle_delete(watcher: Watcher, admin: HttpClient, admin_id: int, disposables: Disposables, results: list[StepResult]) -> None:
    customer = create_customer(admin, disposables, "Eventvehicle", "vehicle-delete-customer", results)
    doomed = create_vehicle(admin, customer, "vehicle-delete-doomed", results)["id"]
    kept = create_vehicle(admin, customer, "vehicle-delete-kept", results)["id"]
    doomed_ids = appointments_on(admin, customer, doomed, [admin_id], 2, "vehicle-delete-doomed-appointment", results)
    appointments_on(admin, customer, kept, [admin_id], 1, "vehicle-delete-kept-appointment", results)
    mark = watcher.settle("vehicle-delete", 3)
    status, _ = admin.request_json("DELETE", f"/api/vehicles/{doomed}")
    assert_status("vehicle-delete", status, {204}, results)
    watcher.expect("vehicle-delete", mark, doomed_ids)

    other = create_customer(admin, disposables, "Eventcustomer", "customer-delete-customer", results)
    ids: list[int] = []
    for index in range(2):
        vehicle = create_vehicle(admin, other, f"customer-delete-vehicle-{index}", results)["id"]
        ids += appointments_on(admin, other, vehicle, [admin_id], 2 - index, f"customer-delete-appointment-{index}", results)
    mark = watcher.settle("customer-delete", len(ids))
    status, _ = admin.request_json("DELETE", f"/api/customers/{other}")
    assert_status("customer-delete", status, {204}, results)
    watcher.expect("customer-delete", mark, ids)


def check_mechanic_deletes(
    base_url: str, origin: str, watcher: Watcher, admin: HttpClient, admin_id: int, disposables: Disposables, results: list[StepResult],
) -> None:
    customer = create_customer(admin, disposables, "Eventmechanic", "mechanic-delete-customer", results)
    vehicle = create_vehicle(admin, customer, "mechanic-delete-vehicle", results)["id"]
    for label, self_delete in (("admin-mechanic-delete", False), ("self-profile-delete", True)):
        credentials, person_id = register_mechanic(admin, disposables, "Eventremoval", f"{label}-register", results)
        member_ids = appointments_on(admin, customer, vehicle, [admin_id, person_id], 2, f"{label}-member-appointment", results)
        appointments_on(admin, customer, vehicle, [admin_id], 1, f"{label}-control-appointment", results)
        session, _ = sign_in(base_url, origin, credentials, f"{label}-login", results)
        mark = watcher.settle(label, 3)
        if self_delete:
            status, _ = session.request_json("DELETE", "/api/profile", {"currentPassword": credentials.password})
        else:
            status, _ = admin.request_json("DELETE", f"/api/admin/mechanics/{person_id}")
        assert_status(label, status, {200}, results)
        watcher.expect(label, mark, member_ids)


def run_checks(base_url: str, origin: str, results: list[StepResult]) -> None:
    stream = load_stream_module()
    admin, login = sign_in(base_url, origin, read_admin_credentials(), "login-admin", results)
    admin_id = int(login["personId"])
    collector = stream.StreamCollector(admin, base_url)
    disposables = Disposables(admin)
    collector.start()
    try:
        opened = collector.wait_until(lambda: stream.STREAM_READY_MARKER in collector.comments, stream.STREAM_OPEN_SECONDS)
        assert_condition("stream-ready", opened, f"The stream did not announce readiness ({collector.error}).", results)
        watcher = Watcher(stream, collector, results)
        check_quote_accept(watcher, admin, admin_id, disposables, results)
        check_customer_and_vehicle_delete(watcher, admin, admin_id, disposables, results)
        check_mechanic_deletes(base_url, origin, watcher, admin, admin_id, disposables, results)
    finally:
        collector.stop()
        disposables.close()


if __name__ == "__main__":
    sys.exit(run_check(run_checks))
