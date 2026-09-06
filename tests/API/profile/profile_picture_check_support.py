#!/usr/bin/env python3
"""Shared HTTP client, fixtures, and assertions for the profile-picture endpoint checks."""

from __future__ import annotations

import json
import os
import struct
import uuid
import zlib
from dataclasses import dataclass
from http.cookiejar import CookieJar
from typing import Any, Iterable
from urllib.error import HTTPError, URLError
from urllib.request import HTTPCookieProcessor, Request, build_opener

APPLICATION_JSON = "application/json"
PROFILE_PICTURE_PATH = "/api/profile/picture"
UNSAFE_HTTP_METHODS = {"POST", "PUT", "PATCH", "DELETE"}

# Status used when the server aborts the connection instead of answering. Kestrel does this when a
# request body trips the size limit mid-upload, so from the client it is a reset, not a 413.
CONNECTION_RESET_STATUS = 0

INVALID_TEXT_BYTES = b"not-an-image-payload"


def build_png(width: int, height: int) -> bytes:
    """Build a structurally valid RGBA PNG with correct chunk CRCs.

    The upload path decodes and re-encodes every image, so fixtures must be real PNGs; a payload
    with only the right magic bytes is rejected with 422.
    """

    def chunk(tag: bytes, data: bytes) -> bytes:
        body = tag + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body) & 0xFFFFFFFF)

    raw = b"".join(
        b"\x00" + b"".join(bytes([(x * 7) % 256, (y * 5) % 256, 128, 255]) for x in range(width))
        for y in range(height)
    )

    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(raw, 6))
        + chunk(b"IEND", b"")
    )


VALID_PNG_BYTES = build_png(1, 1)


@dataclass(frozen=True)
class Credentials:
    email: str
    password: str


@dataclass
class StepResult:
    step: str
    expected: list[int]
    actual: int
    status: str


class HttpClient:
    """Small cookie-aware HTTP client for profile picture endpoint checks."""

    def __init__(self, base_url: str, allowed_origin: str) -> None:
        self.base_url = base_url.rstrip("/")
        self.allowed_origin = allowed_origin
        self.cookie_jar = CookieJar()
        self.opener = build_opener(HTTPCookieProcessor(self.cookie_jar))

    def request_json(self, method: str, path: str, payload: dict[str, Any] | None = None) -> tuple[int, str]:
        body = json.dumps(payload).encode("utf-8") if payload is not None else None
        headers = {"Accept": APPLICATION_JSON}
        if payload is not None:
            headers["Content-Type"] = APPLICATION_JSON
        return self._request(method, path, body, headers)[:2]

    def request_multipart(
        self,
        method: str,
        path: str,
        field_name: str,
        filename: str,
        content_type: str,
        payload_bytes: bytes,
    ) -> tuple[int, str]:
        boundary = f"----ARSMBoundary{uuid.uuid4().hex}"
        body = b"".join(
            [
                f"--{boundary}\r\n".encode("utf-8"),
                f'Content-Disposition: form-data; name="{field_name}"; filename="{filename}"\r\n'.encode("utf-8"),
                f"Content-Type: {content_type}\r\n\r\n".encode("utf-8"),
                payload_bytes,
                b"\r\n",
                f"--{boundary}--\r\n".encode("utf-8"),
            ],
        )
        headers = {"Content-Type": f"multipart/form-data; boundary={boundary}", "Accept": APPLICATION_JSON}
        return self._request(method, path, body, headers)[:2]

    def request_headers(self, method: str, path: str) -> tuple[int, dict[str, str]]:
        """Issue a request and return only the status and response headers."""
        status, _, headers = self._request(method, path, None, {"Accept": "*/*"})
        return status, headers

    def _request(
        self,
        method: str,
        path: str,
        body: bytes | None,
        headers: dict[str, str],
    ) -> tuple[int, str, dict[str, str]]:
        request_headers = dict(headers)
        if method.upper() in UNSAFE_HTTP_METHODS:
            request_headers["Origin"] = self.allowed_origin

        request = Request(url=f"{self.base_url}{path}", data=body, headers=request_headers, method=method)
        try:
            with self.opener.open(request, timeout=30) as response:
                return response.status, response.read().decode("utf-8", errors="replace"), dict(response.headers)
        except HTTPError as error:
            return error.code, error.read().decode("utf-8", errors="replace"), dict(error.headers)
        except (URLError, ConnectionResetError, OSError):
            return CONNECTION_RESET_STATUS, "", {}


def read_credentials() -> list[Credentials]:
    credential_candidates: Iterable[tuple[str, str]] = (
        ("ARSM_TEST_ADMIN_EMAIL", "ARSM_TEST_ADMIN_PASSWORD"),
        ("ARSM_TEST_MECHANIC_EMAIL", "ARSM_TEST_MECHANIC_PASSWORD"),
    )

    credentials: list[Credentials] = []

    for email_key, password_key in credential_candidates:
        email = os.getenv(email_key, "").strip()
        password = os.getenv(password_key, "").strip()
        if email and password:
            credentials.append(Credentials(email=email, password=password))

    if credentials:
        return credentials

    raise RuntimeError(
        "Missing credentials. Set ARSM_TEST_ADMIN_EMAIL/ARSM_TEST_ADMIN_PASSWORD "
        "or ARSM_TEST_MECHANIC_EMAIL/ARSM_TEST_MECHANIC_PASSWORD.",
    )


def read_allowed_origin() -> str:
    """Read the configured WebUI origin used by cookie-auth unsafe requests."""
    origin = os.getenv("ARSM_TEST_WEBUI_ORIGIN", "").strip()
    if origin:
        return origin

    raise RuntimeError("Missing ARSM_TEST_WEBUI_ORIGIN environment variable.")


def assert_status(step: str, actual: int, expected: set[int], results: list[StepResult]) -> None:
    expected_list = sorted(expected)
    status = "passed" if actual in expected else "failed"
    results.append(StepResult(step=step, expected=expected_list, actual=actual, status=status))
    if status == "failed":
        raise RuntimeError(f"{step} failed: expected {expected_list}, got {actual}")


def assert_condition(step: str, condition: bool, detail: str, results: list[StepResult]) -> None:
    """Record a non-status assertion using the same result shape as status checks."""
    status = "passed" if condition else "failed"
    results.append(StepResult(step=step, expected=[1], actual=1 if condition else 0, status=status))
    if status == "failed":
        raise RuntimeError(f"{step} failed: {detail}")
