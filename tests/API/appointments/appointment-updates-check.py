#!/usr/bin/env python3
"""Checks a live SSE subscriber receives an appointment mutation with camelCase payload keys (see tests/CLAUDE.md Coverage Anchors)."""

from __future__ import annotations

import json
import os
import ssl
import sys
import threading
import time
from pathlib import Path
from urllib.request import Request

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from http_check_support import (  # noqa: E402
    HttpClient,
    StepResult,
    assert_condition,
    assert_status,
    read_allowed_origin,
    read_credentials,
    resolve_fixture_customer,
)

APPOINTMENTS_PATH = "/api/appointments"
UPDATES_PATH = "/api/appointments/updates"
STREAM_READY_MARKER = "appointment updates stream ready"
SSE_EVENT_NAME = "appointment-updated"

# How long to wait for the stream to establish before mutating, and for the event afterwards.
STREAM_SETTLE_SECONDS = 2.0
EVENT_WAIT_SECONDS = 15.0


def create_fixture_appointment(client: HttpClient, person_id: int | None, results: list[StepResult]) -> dict:
    """Creates a disposable appointment assigned to the signed-in admin; only an assignee may change its status."""
    assert_condition("signed-in-person-known", person_id is not None, "The login response carried no personId.", results)
    customer = resolve_fixture_customer(client, results)
    status, body = client.request_json(
        "POST",
        f"/api/customers/{customer['id']}/appointments",
        {
            "vehicleId": customer["vehicles"][0]["id"],
            "scheduledDate": time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime()),
            "taskDescription": "ARSM live update check fixture",
            "mechanicIds": [person_id],
        },
    )
    assert_status("create-fixture-appointment", status, {201}, results)
    return json.loads(body)


def collect_stream_frames(client: HttpClient, base_url: str, frames: list[str]) -> None:
    """Drains the SSE stream until the appointment event and its data line arrive."""
    request = Request(f"{base_url}{UPDATES_PATH}", headers={"Accept": "text/event-stream"})
    try:
        with client.opener.open(request, timeout=EVENT_WAIT_SECONDS + 10) as response:
            deadline = time.time() + EVENT_WAIT_SECONDS + 5
            while time.time() < deadline:
                line = response.readline()
                if not line:
                    return
                decoded = line.decode("utf-8", errors="replace").rstrip("\n")
                frames.append(decoded)
                if decoded.startswith(f"event: {SSE_EVENT_NAME}"):
                    data_line = response.readline().decode("utf-8", errors="replace").rstrip("\n")
                    frames.append(data_line)
                    return
    except OSError as error:
        frames.append(f"<stream error: {type(error).__name__}>")


def run_checks(client: HttpClient, base_url: str, person_id: int | None, results: list[StepResult]) -> None:
    """Runs the live update round trip and records each assertion."""
    appointment = create_fixture_appointment(client, person_id, results)
    try:
        run_stream_round_trip(client, base_url, appointment, results)
    finally:
        delete_status, _ = client.request_json("DELETE", f"{APPOINTMENTS_PATH}/{appointment['id']}")
        assert_status("delete-fixture-appointment", delete_status, {204}, results)


def run_stream_round_trip(client: HttpClient, base_url: str, appointment: dict, results: list[StepResult]) -> None:
    """Subscribes to the update stream, changes the status, and asserts the pushed event."""
    original_status = appointment["status"]
    next_status = "Cancelled" if original_status != "Cancelled" else "InProgress"

    frames: list[str] = []
    reader = threading.Thread(target=collect_stream_frames, args=(client, base_url, frames), daemon=True)
    reader.start()
    time.sleep(STREAM_SETTLE_SECONDS)

    assert_condition(
        "stream-ready",
        any(STREAM_READY_MARKER in frame for frame in frames),
        "The updates stream did not announce readiness.",
        results,
    )

    status, _ = client.request_json(
        "PUT",
        f"{APPOINTMENTS_PATH}/{appointment['id']}/status",
        {"status": next_status},
    )
    assert_status("status-change", status, {200}, results)

    reader.join(timeout=EVENT_WAIT_SECONDS)

    assert_condition(
        "event-received",
        any(frame.startswith(f"event: {SSE_EVENT_NAME}") for frame in frames),
        "A live subscriber did not receive the appointment update event.",
        results,
    )

    payload = next(
        (json.loads(frame[len("data: "):]) for frame in frames if frame.startswith("data: ")),
        None,
    )
    assert_condition(
        "payload-is-camel-case",
        payload is not None and "appointmentId" in payload and "occurredAt" in payload,
        f"Event payload keys must be camelCase; got {sorted(payload) if payload else 'no payload'}.",
        results,
    )
    assert_condition(
        "payload-identifies-appointment",
        payload is not None and payload.get("appointmentId") == appointment["id"],
        "Event payload did not carry the mutated appointment id.",
        results,
    )

    restore_status, _ = client.request_json(
        "PUT",
        f"{APPOINTMENTS_PATH}/{appointment['id']}/status",
        {"status": original_status},
    )
    assert_status("status-restored", restore_status, {200}, results)


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
        login_status, login_body = client.request_json(
            "POST",
            "/api/auth/login",
            {"email": credential.email, "password": credential.password},
        )
        login_attempt_statuses.append(login_status)

        if login_status == 429:
            results.append(StepResult(step="login", expected=[200], actual=login_status, status="failed"))
            continue

        assert_status("login", login_status, {200}, results)
        person_id = json.loads(login_body).get("personId") if login_status == 200 and login_body else None
        run_checks(client, base_url, person_id, results)
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
            f"Appointment update checks could not authenticate. Login statuses: {login_attempt_statuses}",
        )

    print(json.dumps({"status": "passed", "checks": [result.__dict__ for result in results]}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
