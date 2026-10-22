#!/usr/bin/env python3
"""Automated multipart profile-picture edge checks and request-size limit checks for local HTTP suite."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from http_check_runner import run_check, sign_in_with_available_login  # noqa: E402
from http_check_support import (  # noqa: E402
    CONNECTION_RESET_STATUS,
    HttpClient,
    StepResult,
    assert_condition,
    assert_status,
)
from profile_picture_check_support import (  # noqa: E402
    INVALID_TEXT_BYTES,
    PROFILE_PICTURE_PATH,
    VALID_PNG_BYTES,
    build_blank_png,
    build_png,
)

# 4 MB upload cap plus the multipart framing allowance the endpoint adds on top of it.
MAX_UPLOAD_BYTES = 4 * 1024 * 1024
OVERSIZE_PAYLOAD_BYTES = 5 * 1024 * 1024

# Every other endpoint stops at this request body size (413); the picture upload must keep working above it.
GLOBAL_BODY_LIMIT_BYTES = 64 * 1024
OVER_JSON_LIMIT_CHARS = 70_000

# 6000 x 4000 pixels are 24 megapixels, over the 20 MP decode guard of the picture processor.
OVER_MEGAPIXEL_DIMENSIONS = (6000, 4000)


def run_checks(base_url: str, origin: str, results: list[StepResult]) -> None:
    """Sign in, then exercise the upload contract: accepted types, re-encoding, size cap, request limits, deletion."""
    client, _ = sign_in_with_available_login(base_url, origin, results)
    larger_png = build_png(700, 500)
    assert_condition(
        "larger-png-exceeds-global-body-limit",
        len(larger_png) > GLOBAL_BODY_LIMIT_BYTES,
        f"The {len(larger_png)} byte fixture no longer outgrows the {GLOBAL_BODY_LIMIT_BYTES} byte body limit.",
        results,
    )

    upload_cases = (
        ("upload-valid-png", "valid-profile.png", "image/png", VALID_PNG_BYTES, {200, 204}),
        ("upload-larger-png", "portrait.png", "image/png", larger_png, {200, 204}),
        ("upload-mime-mismatch", "mismatch.png", "image/jpeg", VALID_PNG_BYTES, {422}),
        ("upload-invalid-magic-bytes", "not-image.png", "image/png", INVALID_TEXT_BYTES, {422}),
    )

    for step, filename, content_type, payload_bytes, expected_statuses in upload_cases:
        upload_status, _ = client.request_multipart("PUT", PROFILE_PICTURE_PATH, "file", filename, content_type, payload_bytes)
        assert_status(step, upload_status, expected_statuses, results)

    run_stored_format_check(client, results)
    run_size_limit_checks(client, results)
    run_request_limit_checks(client, results)

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

    cache_control = headers.get("Cache-Control", "")
    assert_condition(
        "picture-keeps-private-caching",
        "private" in cache_control and "max-age=3600" in cache_control and "no-store" not in cache_control,
        f"expected private, max-age=3600 and no no-store, got {cache_control!r}",
        results,
    )

    run_etag_conditional_checks(client, headers, results)


def run_etag_conditional_checks(client: HttpClient, headers: dict[str, str], results: list[StepResult]) -> None:
    """Answers 304 only on the stored ETag; any other If-None-Match value still gets 200 (IsNotModified)."""
    etag = headers.get("ETag", "")
    assert_condition("get-picture-has-etag", bool(etag), "expected an ETag header on the stored picture", results)

    match_status, _ = client.request_headers("GET", PROFILE_PICTURE_PATH, {"If-None-Match": etag})
    assert_status("get-picture-etag-match", match_status, {304}, results)

    mismatch_status, _ = client.request_headers(
        "GET", PROFILE_PICTURE_PATH, {"If-None-Match": '"not-the-stored-etag"'},
    )
    assert_status("get-picture-etag-mismatch", mismatch_status, {200}, results)


def run_size_limit_checks(client: HttpClient, results: list[StepResult]) -> None:
    """Reject payloads over the 4 MB cap (just-over hits the handler; way over trips Kestrel's transport limit)."""
    just_over = build_png(600, 600).ljust(MAX_UPLOAD_BYTES + 1024, b"\x00")
    status, _ = client.request_multipart("PUT", PROFILE_PICTURE_PATH, "file", "just-over.png", "image/png", just_over)
    assert_status("upload-just-over-limit", status, {400}, results)

    oversize = build_png(600, 600).ljust(OVERSIZE_PAYLOAD_BYTES, b"\x00")
    status, _ = client.request_multipart("PUT", PROFILE_PICTURE_PATH, "file", "oversize.png", "image/png", oversize)
    assert_status("upload-oversize-body", status, {400, 413, CONNECTION_RESET_STATUS}, results)


def run_request_limit_checks(client: HttpClient, results: list[StepResult]) -> None:
    """JSON bodies stop at 64 KB (413); an image over 20 megapixels is refused by the decode guard (422)."""
    status, _ = client.request_json("PUT", "/api/profile", {"middleName": "a" * OVER_JSON_LIMIT_CHARS})
    assert_status("profile-json-over-body-limit", status, {413}, results)

    status, body = client.request_multipart(
        "PUT", PROFILE_PICTURE_PATH, "file", "huge.png", "image/png", build_blank_png(*OVER_MEGAPIXEL_DIMENSIONS),
    )
    assert_status("upload-over-megapixel-limit", status, {422}, results)
    assert_condition("megapixel-limit-message", "20 megapixels" in body, f"unexpected rejection body: {body[:200]}", results)


if __name__ == "__main__":
    sys.exit(run_check(run_checks))
