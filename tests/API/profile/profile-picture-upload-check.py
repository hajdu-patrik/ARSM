#!/usr/bin/env python3
"""Automated multipart profile-picture edge checks for local HTTP suite."""

from __future__ import annotations

import json
import os
import ssl
import sys
import uuid
from dataclasses import dataclass
from http.cookiejar import CookieJar
from typing import Any, Iterable
from urllib.error import HTTPError, URLError
from urllib.request import HTTPCookieProcessor, HTTPSHandler, Request, build_opener

VALID_PNG_BYTES = bytes.fromhex(
    "89504E470D0A1A0A"
    "0000000D49484452000000010000000108060000001F15C489"
    "0000000A49444154789C6360000000020001E221BC330000000049454E44AE426082"
)
INVALID_TEXT_BYTES = b"not-an-image-payload"


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
    def __init__(self, base_url: str) -> None:
        self.base_url = base_url.rstrip("/")
        self.cookie_jar = CookieJar()
        ssl_context = ssl._create_unverified_context()
        self.opener = build_opener(HTTPCookieProcessor(self.cookie_jar), HTTPSHandler(context=ssl_context))

    def request_json(self, method: str, path: str, payload: dict[str, Any] | None = None) -> tuple[int, str]:
        body = json.dumps(payload).encode("utf-8") if payload is not None else None
        headers = {"Accept": "application/json"}
        if payload is not None:
            headers["Content-Type"] = "application/json"
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
        headers = {"Content-Type": f"multipart/form-data; boundary={boundary}", "Accept": "application/json"}
        return self._request(method, path, body, headers)

    def _request(
        self,
        method: str,
        path: str,
        body: bytes | None,
        headers: dict[str, str],
    ) -> tuple[int, str]:
        request = Request(url=f"{self.base_url}{path}", data=body, headers=headers, method=method)
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


def assert_status(step: str, actual: int, expected: set[int], results: list[StepResult]) -> None:
    expected_list = sorted(expected)
    status = "passed" if actual in expected else "failed"
    results.append(StepResult(step=step, expected=expected_list, actual=actual, status=status))
    if status == "failed":
        raise RuntimeError(f"{step} failed: expected {expected_list}, got {actual}")


def run_upload_checks(client: HttpClient, results: list[StepResult]) -> None:
    valid_upload_status, _ = client.request_multipart(
        "PUT",
        "/api/profile/picture",
        "file",
        "valid-profile.png",
        "image/png",
        VALID_PNG_BYTES,
    )
    assert_status("upload-valid-png", valid_upload_status, {200, 204}, results)

    mime_mismatch_status, _ = client.request_multipart(
        "PUT",
        "/api/profile/picture",
        "file",
        "mismatch.png",
        "image/jpeg",
        VALID_PNG_BYTES,
    )
    assert_status("upload-mime-mismatch", mime_mismatch_status, {422}, results)

    invalid_payload_status, _ = client.request_multipart(
        "PUT",
        "/api/profile/picture",
        "file",
        "not-image.png",
        "image/png",
        INVALID_TEXT_BYTES,
    )
    assert_status("upload-invalid-magic-bytes", invalid_payload_status, {422}, results)

    delete_status, _ = client.request_json("DELETE", "/api/profile/picture")
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
        login_attempt_statuses: list[int] = []

        for credential in credentials:
            results.clear()
            client = HttpClient(base_url)
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
