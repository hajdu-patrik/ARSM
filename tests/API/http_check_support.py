#!/usr/bin/env python3
"""Shared HTTP client, credentials, and assertions for the API endpoint checks.

Kept separate from any one feature's fixtures so a new check does not have to import
from a module named after an unrelated feature.
"""

from __future__ import annotations

import json
import os
import uuid
from dataclasses import dataclass
from http.cookiejar import CookieJar
from typing import Any, Iterable
from urllib.error import HTTPError, URLError
from urllib.request import HTTPCookieProcessor, Request, build_opener

APPLICATION_JSON = "application/json"
UNSAFE_HTTP_METHODS = {"POST", "PUT", "PATCH", "DELETE"}

# urllib surfaces a server-side connection reset as an OSError rather than a status code.
CONNECTION_RESET_STATUS = 0


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

    def request_binary(self, method: str, path: str) -> tuple[int, bytes, dict[str, str]]:
        """Issue a request and return the raw body, for endpoints that answer with a file."""
        return self._request_raw(method, path, None, {"Accept": "*/*"})

    def _request(
        self,
        method: str,
        path: str,
        body: bytes | None,
        headers: dict[str, str],
    ) -> tuple[int, str, dict[str, str]]:
        status, raw_body, response_headers = self._request_raw(method, path, body, headers)
        return status, raw_body.decode("utf-8", errors="replace"), response_headers

    def _request_raw(
        self,
        method: str,
        path: str,
        body: bytes | None,
        headers: dict[str, str],
    ) -> tuple[int, bytes, dict[str, str]]:
        request_headers = dict(headers)
        if method.upper() in UNSAFE_HTTP_METHODS:
            request_headers["Origin"] = self.allowed_origin

        request = Request(url=f"{self.base_url}{path}", data=body, headers=request_headers, method=method)
        try:
            with self.opener.open(request, timeout=30) as response:
                return response.status, response.read(), dict(response.headers)
        except HTTPError as error:
            return error.code, error.read(), dict(error.headers)
        except (URLError, ConnectionResetError, OSError):
            return CONNECTION_RESET_STATUS, b"", {}


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
