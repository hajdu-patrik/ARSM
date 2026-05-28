#!/usr/bin/env python3
"""Automated multipart profile-picture edge checks for local HTTP suite."""

from __future__ import annotations

import json
import os
import sys
import uuid
from dataclasses import dataclass
from http.cookiejar import CookieJar
from typing import Any, Iterable
from urllib.error import HTTPError, URLError
from urllib.request import HTTPCookieProcessor, Request, build_opener

APPLICATION_JSON = "application/json"
PROFILE_PICTURE_PATH = "/api/profile/picture"

VALID_PNG_BYTES = bytes.fromhex(
    "89504E470D0A1A0A"
    "0000000D49484452000000010000000108060000001F15C489"
    "0000000A49444154789C6360000000020001E221BC330000000049454E44AE426082"
)
INVALID_TEXT_BYTES = b"not-an-image-payload"
UNSAFE_HTTP_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


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
        return self._request(method, path, body, headers)

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
        return self._request(method, path, body, headers)

    def _request(
        self,
        method: str,
        path: str,
        body: bytes | None,
        headers: dict[str, str],
    ) -> tuple[int, str]:
        request_headers = dict(headers)
        if method.upper() in UNSAFE_HTTP_METHODS:
            request_headers["Origin"] = self.allowed_origin

        request = Request(url=f"{self.base_url}{path}", data=body, headers=request_headers, method=method)
        try:
            with self.opener.open(request, timeout=30) as response:
                return response.status, response.read().decode("utf-8", errors="replace")
        except HTTPError as error:
            return error.code, error.read().decode("utf-8", errors="replace")
        except URLError as error:
            raise RuntimeError(f"Network error during {method} {path}: {error.reason}") from error


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


def run_upload_checks(client: HttpClient, results: list[StepResult]) -> None:
    upload_cases = (
        ("upload-valid-png", "valid-profile.png", "image/png", VALID_PNG_BYTES, {200, 204}),
        ("upload-mime-mismatch", "mismatch.png", "image/jpeg", VALID_PNG_BYTES, {422}),
        ("upload-invalid-magic-bytes", "not-image.png", "image/png", INVALID_TEXT_BYTES, {422}),
    )

    for step, filename, content_type, payload_bytes, expected_statuses in upload_cases:
        upload_status, _ = client.request_multipart("PUT", PROFILE_PICTURE_PATH, "file", filename, content_type, payload_bytes)
        assert_status(step, upload_status, expected_statuses, results)

    delete_status, _ = client.request_json("DELETE", PROFILE_PICTURE_PATH)
    assert_status("delete-picture", delete_status, {200, 204}, results)

    logout_status, _ = client.request_json("POST", "/api/auth/logout")
    assert_status("logout", logout_status, {200, 204}, results)


def main() -> int:
    results: list[StepResult] = []

    try:
        base_url = os.getenv("AutoService_ApiService_HostAddress", "").strip()
        if not base_url:
            raise RuntimeError("Missing AutoService_ApiService_HostAddress environment variable.")

        credentials = read_credentials()
        allowed_origin = read_allowed_origin()
        login_attempt_statuses: list[int] = []

        for credential in credentials:
            results.clear()
            client = HttpClient(base_url, allowed_origin)
            login_status, _ = client.request_json(
                "POST",
                "/api/auth/login",
                {"email": credential.email, "password": credential.password},
            )
            login_attempt_statuses.append(login_status)

            if login_status == 429:
                results.append(StepResult(step="login", expected=[200], actual=login_status, status="failed"))
                continue

            assert_status("login", login_status, {200}, results)
            run_upload_checks(client, results)
            break
        else:
            if login_attempt_statuses and all(status == 429 for status in login_attempt_statuses):
                print(
                    json.dumps(
                        {
                            "status": "skipped",
                            "reason": "All available credentials were rate-limited during login.",
                            "loginStatuses": login_attempt_statuses,
                            "checks": [result.__dict__ for result in results],
                        },
                        ensure_ascii=False,
                    ),
                )
                return 0

            raise RuntimeError(
                "Profile picture upload checks could not authenticate. "
                f"Login statuses: {login_attempt_statuses}",
            )

        print(
            json.dumps(
                {
                    "status": "passed",
                    "checks": [result.__dict__ for result in results],
                },
                ensure_ascii=False,
            ),
        )
        return 0
    except Exception as error:  # pylint: disable=broad-exception-caught
        print(
            json.dumps(
                {
                    "status": "failed",
                    "error": str(error),
                    "checks": [result.__dict__ for result in results],
                },
                ensure_ascii=False,
            ),
        )
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
