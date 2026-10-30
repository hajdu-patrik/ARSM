#!/usr/bin/env python3
"""Checks GET /api/profile/picture/updates: 401 without a session, an SSE stream, and camelCase events for an upload and a delete."""

from __future__ import annotations

import json
import sys
import threading
import time
from pathlib import Path
from urllib.request import Request

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from http_check_runner import run_check, sign_in_with_available_login  # noqa: E402
from http_check_support import HttpClient, StepResult, assert_condition, assert_status  # noqa: E402
from profile_picture_check_support import PROFILE_PICTURE_PATH, VALID_PNG_BYTES  # noqa: E402

UPDATES_PATH = "/api/profile/picture/updates"
STREAM_READY_MARKER = "profile picture updates stream ready"
SSE_EVENT_NAME = "profile-picture-updated"
EXPECTED_PAYLOAD_KEYS = {"personId", "hasProfilePicture", "cacheBuster"}

# How long to wait for the stream to announce itself and for each event afterwards (every wait step stays well under 5 s).
POLL_STEP_SECONDS = 0.2
STREAM_READY_WAIT_SECONDS = 4.0
EVENT_WAIT_SECONDS = 4.0
READ_TIMEOUT_SECONDS = 30


class StreamRecorder:
    """Reads the SSE stream on a background thread and keeps every line it sees."""

    def __init__(self, client: HttpClient, base_url: str) -> None:
        self.frames: list[str] = []
        self.content_type = ""
        self.response = None
        self._client = client
        self._request = Request(f"{base_url}{UPDATES_PATH}", headers={"Accept": "text/event-stream"})
        self._thread = threading.Thread(target=self._drain, daemon=True)

    def start(self) -> None:
        self._thread.start()

    def close(self) -> None:
        if self.response is not None:
            self.response.close()

    def wait_until(self, condition, seconds: float) -> bool:
        """Polls the recorded lines until the condition holds or the wait is over."""
        deadline = time.time() + seconds
        while time.time() < deadline:
            if condition():
                return True
            time.sleep(POLL_STEP_SECONDS)
        return condition()

    def events(self) -> list[dict]:
        """Pairs each event line with the data line that follows it, parsed as JSON."""
        parsed: list[dict] = []
        for index, frame in enumerate(self.frames):
            if frame.startswith(f"event: {SSE_EVENT_NAME}") and index + 1 < len(self.frames):
                data = self.frames[index + 1]
                if data.startswith("data: "):
                    parsed.append(json.loads(data[len("data: "):]))
        return parsed

    def _drain(self) -> None:
        try:
            self.response = self._client.opener.open(self._request, timeout=READ_TIMEOUT_SECONDS)
            self.content_type = self.response.headers.get("Content-Type", "")
            while True:
                line = self.response.readline()
                if not line:
                    return
                self.frames.append(line.decode("utf-8", errors="replace").rstrip("\n"))
        except (OSError, ValueError) as error:
            self.frames.append(f"<stream ended: {type(error).__name__}>")


def check_requires_authentication(base_url: str, origin: str, results: list[StepResult]) -> None:
    """A client without a session is refused before any stream opens."""
    status, _ = HttpClient(base_url, origin).request_headers("GET", UPDATES_PATH, {"Accept": "text/event-stream"})
    assert_status("updates-stream-needs-authentication", status, {401}, results)


def check_event_payload(event: dict, person_id: int, has_picture: bool, step: str, results: list[StepResult]) -> None:
    """The payload keys are camelCase and carry the person, the new picture state and a millisecond cache buster."""
    assert_condition(f"{step}-payload-keys-are-camel-case", set(event) == EXPECTED_PAYLOAD_KEYS, f"keys were {sorted(event)}", results)
    assert_condition(f"{step}-payload-identifies-the-person", event.get("personId") == person_id, f"payload was {event}", results)
    assert_condition(
        f"{step}-payload-has-the-new-state", event.get("hasProfilePicture") is has_picture, f"payload was {event}", results,
    )
    buster = event.get("cacheBuster")
    assert_condition(f"{step}-payload-has-a-cache-buster", isinstance(buster, int) and buster > 0, f"payload was {event}", results)


def run_stream_round_trip(client: HttpClient, base_url: str, person_id: int, results: list[StepResult]) -> None:
    """Subscribes, uploads a picture, deletes it, and asserts the two pushed events in order."""
    recorder = StreamRecorder(client, base_url)
    recorder.start()
    try:
        ready = recorder.wait_until(lambda: any(STREAM_READY_MARKER in frame for frame in recorder.frames), STREAM_READY_WAIT_SECONDS)
        assert_condition("stream-announces-readiness", ready, f"frames were {recorder.frames[:5]}", results)
        assert_condition(
            "stream-is-event-stream",
            recorder.content_type.startswith("text/event-stream"),
            f"Content-Type was {recorder.content_type!r}",
            results,
        )

        status, _ = client.request_multipart("PUT", PROFILE_PICTURE_PATH, "file", "live.png", "image/png", VALID_PNG_BYTES)
        assert_status("upload-triggers-an-event", status, {200}, results)
        got_upload = recorder.wait_until(lambda: len(recorder.events()) >= 1, EVENT_WAIT_SECONDS)
        assert_condition("upload-event-received", got_upload, f"frames were {recorder.frames[:8]}", results)
        check_event_payload(recorder.events()[0], person_id, True, "upload-event", results)

        status, _ = client.request_json("DELETE", PROFILE_PICTURE_PATH)
        assert_status("delete-triggers-an-event", status, {200}, results)
        got_delete = recorder.wait_until(lambda: len(recorder.events()) >= 2, EVENT_WAIT_SECONDS)
        assert_condition("delete-event-received", got_delete, f"frames were {recorder.frames[:12]}", results)
        check_event_payload(recorder.events()[1], person_id, False, "delete-event", results)
        assert_condition(
            "cache-buster-does-not-go-backwards",
            recorder.events()[1]["cacheBuster"] >= recorder.events()[0]["cacheBuster"],
            "the delete event carried an older cache buster than the upload event",
            results,
        )
    finally:
        recorder.close()


def run_checks(base_url: str, origin: str, results: list[StepResult]) -> None:
    """Signs in, runs the live-update round trip, always removes the uploaded picture and signs out."""
    # The sign-in helper clears the results while it tries credentials, so the unauthenticated check comes after it.
    client, login = sign_in_with_available_login(base_url, origin, results)
    try:
        check_requires_authentication(base_url, origin, results)
        run_stream_round_trip(client, base_url, int(login["personId"]), results)
    finally:
        client.request_json("DELETE", PROFILE_PICTURE_PATH)
        client.request_json("POST", "/api/auth/logout")


if __name__ == "__main__":
    sys.exit(run_check(run_checks))
