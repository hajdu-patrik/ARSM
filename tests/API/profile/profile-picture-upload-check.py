#!/usr/bin/env python3
"""Automated multipart profile-picture edge checks for local HTTP suite."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from profile_picture_check_support import (  # noqa: E402
    CONNECTION_RESET_STATUS,
    INVALID_TEXT_BYTES,
    PROFILE_PICTURE_PATH,
    VALID_PNG_BYTES,
    HttpClient,
    StepResult,
    assert_condition,
    assert_status,
    build_png,
    read_allowed_origin,
    read_credentials,
)

# 4 MB upload cap plus the multipart framing allowance the endpoint adds on top of it.
MAX_UPLOAD_BYTES = 4 * 1024 * 1024
OVERSIZE_PAYLOAD_BYTES = 5 * 1024 * 1024


def run_upload_checks(client: HttpClient, results: list[StepResult]) -> None:
    """Exercise the upload contract: accepted types, re-encoding, size cap, and deletion."""
    upload_cases = (
        ("upload-valid-png", "valid-profile.png", "image/png", VALID_PNG_BYTES, {200, 204}),
        ("upload-larger-png", "portrait.png", "image/png", build_png(700, 500), {200, 204}),
        ("upload-mime-mismatch", "mismatch.png", "image/jpeg", VALID_PNG_BYTES, {422}),
        ("upload-invalid-magic-bytes", "not-image.png", "image/png", INVALID_TEXT_BYTES, {422}),
    )

    for step, filename, content_type, payload_bytes, expected_statuses in upload_cases:
        upload_status, _ = client.request_multipart("PUT", PROFILE_PICTURE_PATH, "file", filename, content_type, payload_bytes)
        assert_status(step, upload_status, expected_statuses, results)

    run_stored_format_check(client, results)
    run_size_limit_checks(client, results)

    delete_status, _ = client.request_json("DELETE", PROFILE_PICTURE_PATH)
    assert_status("delete-picture", delete_status, {200, 204}, results)

    missing_status, _ = client.request_json("GET", PROFILE_PICTURE_PATH)
    assert_status("get-after-delete", missing_status, {404}, results)

    logout_status, _ = client.request_json("POST", "/api/auth/logout")
    assert_status("logout", logout_status, {200, 204}, results)


def run_stored_format_check(client: HttpClient, results: list[StepResult]) -> None:
    """A PNG goes in, WebP comes back: the server re-encodes every stored picture."""
    status, headers = client.request_headers("GET", PROFILE_PICTURE_PATH)
    assert_status("get-picture", status, {200}, results)

    content_type = headers.get("Content-Type", "")
    assert_condition(
        "stored-picture-is-webp",
        content_type == "image/webp",
        f"expected image/webp, got {content_type!r}",
        results,
    )


def run_size_limit_checks(client: HttpClient, results: list[StepResult]) -> None:
    """Reject payloads over the 4 MB cap.

    A body just over the cap still fits inside the transport allowance, so it reaches the handler
    and comes back as a validation problem. A grossly oversized body trips the transport limit
    instead, which Kestrel answers with 413 or by aborting the connection.
    """
    just_over = build_png(600, 600).ljust(MAX_UPLOAD_BYTES + 1024, b"\x00")
    status, _ = client.request_multipart("PUT", PROFILE_PICTURE_PATH, "file", "just-over.png", "image/png", just_over)
    assert_status("upload-just-over-limit", status, {400}, results)

    oversize = build_png(600, 600).ljust(OVERSIZE_PAYLOAD_BYTES, b"\x00")
    status, _ = client.request_multipart("PUT", PROFILE_PICTURE_PATH, "file", "oversize.png", "image/png", oversize)
    assert_status("upload-oversize-body", status, {400, 413, CONNECTION_RESET_STATUS}, results)


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
