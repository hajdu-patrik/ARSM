#!/usr/bin/env python3
"""Checks the appointment SSE stream: 401 without a session, stream headers, one camelCase event per successful write, none for a refused one."""

from __future__ import annotations

import json
import sys
import threading
import time
from pathlib import Path
from urllib.request import Request

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from http_check_runner import run_check, sign_in_with_available_login  # noqa: E402
from http_check_support import (  # noqa: E402
    HttpClient,
    StepResult,
    assert_condition,
    assert_status,
    resolve_fixture_customer,
)

APPOINTMENTS_PATH = "/api/appointments"
UPDATES_PATH = "/api/appointments/updates"
STREAM_READY_MARKER = "appointment updates stream ready"
SSE_EVENT_NAME = "appointment-updated"
EXPECTED_PAYLOAD_KEYS = {"appointmentId", "occurredAt"}

# Waits: for the stream to open, for each pushed event, and the quiet period that proves a refused write sent none.
STREAM_OPEN_SECONDS = 10.0
EVENT_WAIT_SECONDS = 15.0
QUIET_PERIOD_SECONDS = 1.5
OCCURRED_AT_TOLERANCE_MS = 120_000


class StreamCollector:
    """Reads the SSE stream on a thread and keeps the response head, the comment frames and the parsed events."""

    def __init__(self, client: HttpClient, base_url: str) -> None:
        self.client = client
        self.url = f"{base_url}{UPDATES_PATH}"
        self.status = 0
        self.headers: dict[str, str] = {}
        self.comments: list[str] = []
        self.events: list[tuple[str, dict]] = []
        self.error = ""
        self._changed = threading.Condition()
        self._stop = False

    def start(self) -> None:
        threading.Thread(target=self._run, daemon=True).start()

    def stop(self) -> None:
        self._stop = True

    def wait_until(self, predicate, timeout: float) -> bool:
        """Blocks until predicate() is true or the timeout passes; returns the final predicate value."""
        deadline = time.time() + timeout
        with self._changed:
            while not predicate():
                remaining = deadline - time.time()
                if remaining <= 0:
                    return False
                self._changed.wait(remaining)
        return True

    def _run(self) -> None:
        request = Request(self.url, headers={"Accept": "text/event-stream"})
        try:
            with self.client.opener.open(request, timeout=EVENT_WAIT_SECONDS + 10) as response:
                self.status = response.status
                self.headers = {name.lower(): value for name, value in response.headers.items()}
                self._read_frames(response)
        except OSError as error:
            self.error = type(error).__name__
        finally:
            with self._changed:
                self._stop = True
                self._changed.notify_all()

    def _read_frames(self, response) -> None:
        event_name = ""
        while not self._stop:
            line = response.readline()
            if not line:
                return
            text = line.decode("utf-8", errors="replace").rstrip("\r\n")
            with self._changed:
                if text.startswith(":"):
                    self.comments.append(text[1:].strip())
                elif text.startswith("event:"):
                    event_name = text[len("event:"):].strip()
                elif text.startswith("data:"):
                    self.events.append((event_name, json.loads(text[len("data:"):].strip())))
                self._changed.notify_all()


def create_fixture_appointment(client: HttpClient, person_id: int | None, scheduled: str, results: list[StepResult]) -> dict:
    """Creates a disposable appointment assigned to the signed-in admin on the fixture customer's first vehicle."""
    assert_condition("signed-in-person-known", person_id is not None, "The login response carried no personId.", results)
    customer = resolve_fixture_customer(client, results)
    status, body = client.request_json(
        "POST",
        f"/api/customers/{customer['id']}/appointments",
        {
            "vehicleId": customer["vehicles"][0]["id"],
            "scheduledDate": scheduled,
            "taskDescription": "ARSM live update check fixture",
            "mechanicIds": [person_id],
        },
    )
    assert_status("create-fixture-appointment", status, {201}, results)
    return json.loads(body)


def expect_event(collector: StreamCollector, step: str, count: int, appointment_id: int, results: list[StepResult]) -> dict:
    """Waits for the count-th event and asserts its name, id, keys and timestamp; returns the payload."""
    arrived = collector.wait_until(lambda: len(collector.events) >= count, EVENT_WAIT_SECONDS)
    assert_condition(f"{step}-event-received", arrived, f"No event number {count} reached the subscriber.", results)
    name, payload = collector.events[count - 1]
    assert_condition(f"{step}-event-name", name == SSE_EVENT_NAME, f"Unexpected event name {name!r}.", results)
    assert_condition(
        f"{step}-payload-is-camel-case",
        set(payload) == EXPECTED_PAYLOAD_KEYS,
        f"Payload keys must be exactly {sorted(EXPECTED_PAYLOAD_KEYS)}; got {sorted(payload)}.",
        results,
    )
    assert_condition(
        f"{step}-payload-identifies-appointment",
        payload["appointmentId"] == appointment_id,
        "The event did not carry the changed appointment id.",
        results,
    )
    drift = abs(int(time.time() * 1000) - payload["occurredAt"])
    assert_condition(
        f"{step}-occurred-at-is-unix-milliseconds",
        isinstance(payload["occurredAt"], int) and drift < OCCURRED_AT_TOLERANCE_MS,
        f"occurredAt is not a current Unix timestamp in milliseconds (drift {drift} ms).",
        results,
    )
    return payload


def run_stream_round_trip(client: HttpClient, collector: StreamCollector, appointment: dict, scheduled: str, results: list[StepResult]) -> None:
    """Publishes an update, a status change, a refused stale write and a delete; checks the events each one pushed."""
    path = f"{APPOINTMENTS_PATH}/{appointment['id']}"
    expect_event(collector, "create", 1, appointment["id"], results)

    status, body = client.request_json(
        "PUT", path, {"dueDateTime": scheduled, "taskDescription": "ARSM live update edited", "version": appointment["version"]},
    )
    assert_status("update-appointment", status, {200}, results)
    updated = json.loads(body)
    expect_event(collector, "update", 2, appointment["id"], results)

    status, _ = client.request_json("PUT", f"{path}/status", {"status": "Cancelled", "version": updated["version"]})
    assert_status("status-change", status, {200}, results)
    expect_event(collector, "status", 3, appointment["id"], results)

    status, _ = client.request_json(
        "PUT", path, {"dueDateTime": scheduled, "taskDescription": "ARSM stale write", "version": appointment["version"]},
    )
    assert_status("stale-update-refused", status, {409}, results)
    time.sleep(QUIET_PERIOD_SECONDS)
    assert_condition("refused-write-pushes-no-event", len(collector.events) == 3, "A refused write pushed an event.", results)

    status, _ = client.request_json("DELETE", path)
    assert_status("delete-appointment", status, {204}, results)
    expect_event(collector, "delete", 4, appointment["id"], results)


def run_checks(base_url: str, origin: str, results: list[StepResult]) -> None:
    """Checks the unauthenticated refusal, then the stream head and the event round trip of an admin session."""
    client, login = sign_in_with_available_login(base_url, origin, results)
    anonymous_status, _ = HttpClient(base_url, origin).request_headers("GET", UPDATES_PATH, {"Accept": "text/event-stream"})
    assert_status("stream-requires-authentication", anonymous_status, {401}, results)

    scheduled = time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime())
    collector = StreamCollector(client, base_url)
    collector.start()
    appointment: dict | None = None
    deleted = False
    try:
        opened = collector.wait_until(lambda: STREAM_READY_MARKER in collector.comments, STREAM_OPEN_SECONDS)
        assert_condition("stream-ready", opened, f"The stream did not announce readiness ({collector.error}).", results)
        assert_status("stream-status", collector.status, {200}, results)
        assert_condition(
            "stream-content-type",
            collector.headers.get("content-type", "").startswith("text/event-stream"),
            f"Unexpected content type {collector.headers.get('content-type')!r}.",
            results,
        )
        assert_condition(
            "stream-not-cached",
            "no-cache" in collector.headers.get("cache-control", ""),
            "The stream response must carry Cache-Control: no-cache.",
            results,
        )
        appointment = create_fixture_appointment(client, login.get("personId"), scheduled, results)
        run_stream_round_trip(client, collector, appointment, scheduled, results)
        deleted = True
    finally:
        collector.stop()
        if appointment is not None and not deleted:
            client.request_json("DELETE", f"{APPOINTMENTS_PATH}/{appointment['id']}")
        client.request_json("POST", "/api/auth/logout")


if __name__ == "__main__":
    sys.exit(run_check(run_checks))
