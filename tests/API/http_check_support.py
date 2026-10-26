#!/usr/bin/env python3
"""Shared HTTP client, credentials, and assertions for the API endpoint checks."""

from __future__ import annotations

import json
import os
import uuid
from dataclasses import dataclass
from http.cookiejar import CookieJar
from typing import Any, Iterable
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import HTTPCookieProcessor, Request, build_opener

APPLICATION_JSON = "application/json"
UNSAFE_HTTP_METHODS = {"POST", "PUT", "PATCH", "DELETE"}

# CSRF double-submit pair (Middleware/CsrfDoubleSubmitMiddleware): the cookie the client reads and the
# header it echoes the value into on every unsafe, cookie-authenticated /api request.
CSRF_COOKIE_NAME = "__Host-arsm-csrf-token"
CSRF_HEADER_NAME = "X-CSRF-Token"

# Refresh-token cookie (Auth/Session/AuthCookieNames), rotated by every login, refresh and password change.
REFRESH_COOKIE_NAME = "__Host-arsm-refresh-token"

# urllib surfaces a server-side connection reset as an OSError rather than a status code.
CONNECTION_RESET_STATUS = 0

# Shared fixtures created by tests/API/_setup/ensure-test-fixtures.http (a fresh database holds no demo data).
ANCHOR_QUOTE_TITLE = "ARSM fixture anchor quote"


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

    def cookie_value(self, name: str) -> str | None:
        """Returns the current value of a cookie in the jar, or ``None`` when it is not set (before login)."""
        for cookie in self.cookie_jar:
            if cookie.name == name:
                return cookie.value
        return None

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

    def request_headers(
        self, method: str, path: str, headers: dict[str, str] | None = None,
    ) -> tuple[int, dict[str, str]]:
        """Issue a request and return only the status and response headers."""
        request_headers = {"Accept": "*/*"}
        if headers:
            request_headers.update(headers)
        status, _, response_headers = self._request(method, path, None, request_headers)
        return status, response_headers

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
            # Double-submit CSRF proof: echo the cookie already in the jar (set by a prior
            # login/refresh/password-change) back as the header; missing before the first login is fine.
            csrf_token = self.cookie_value(CSRF_COOKIE_NAME)
            if csrf_token and CSRF_HEADER_NAME not in request_headers:
                request_headers[CSRF_HEADER_NAME] = csrf_token

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


def read_required_env(name: str) -> str:
    """Read a required environment variable, failing with its name when it is missing or blank."""
    value = os.getenv(name, "").strip()
    if value:
        return value

    raise RuntimeError(f"Missing {name} environment variable.")


def read_admin_credentials() -> Credentials:
    """Read the bootstrap admin login that the admin-only checks need (a mechanic login would answer 403)."""
    return Credentials(read_required_env("ARSM_TEST_ADMIN_EMAIL"), read_required_env("ARSM_TEST_ADMIN_PASSWORD"))


def read_allowed_origin() -> str:
    """Read the configured WebUI origin used by cookie-auth unsafe requests."""
    return read_required_env("ARSM_TEST_WEBUI_ORIGIN")


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


def find_anchor_quote(client: HttpClient, results: list[StepResult]) -> dict[str, Any]:
    """Returns the list item of the fixture anchor quote that the _setup suite creates."""
    status, body = client.request_json("GET", f"/api/quotes?search={quote(ANCHOR_QUOTE_TITLE)}&pageSize=500")
    assert_status("list-quotes", status, {200}, results)

    quotes = (json.loads(body) if body else {}).get("items", [])
    anchor = next((item for item in quotes if item.get("title") == ANCHOR_QUOTE_TITLE), None)
    assert_condition(
        "anchor-quote-available",
        anchor is not None,
        f"Fixture quote '{ANCHOR_QUOTE_TITLE}' is missing; run tests/API/_setup first.",
        results,
    )
    assert anchor is not None

    return anchor


def read_fixture_customer_email() -> str:
    """Read the email of the shared fixture customer that the _setup suite creates."""
    return read_required_env("ARSM_TEST_CUSTOMER_EMAIL")


def resolve_fixture_customer(client: HttpClient, results: list[StepResult]) -> dict[str, Any]:
    """Returns the scheduler lookup payload (id and vehicles) of the shared fixture customer."""
    status, body = client.request_json("GET", f"/api/customers/by-email?email={quote(read_fixture_customer_email())}")
    assert_status("lookup-fixture-customer", status, {200}, results)

    customer = json.loads(body) if body else {}
    assert_condition(
        "fixture-customer-has-vehicle",
        bool(customer.get("vehicles")),
        "The fixture customer has no vehicle; run tests/API/_setup first.",
        results,
    )

    return customer
