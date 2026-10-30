#!/usr/bin/env python3
"""Profile-picture upload contract (formats in, WebP out, rejections, ETag, id route) and the request-size limits."""

from __future__ import annotations

import json
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
    CORRUPT_PNG_BYTES,
    INVALID_TEXT_BYTES,
    PROFILE_PICTURE_PATH,
    VALID_JPEG_BYTES,
    VALID_PNG_BYTES,
    VALID_WEBP_BYTES,
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


def upload(
    client: HttpClient, step: str, file_spec: tuple[str, str, bytes], expected: int, message: str | None, results: list[StepResult],
) -> None:
    """Uploads one file, asserts the status and, when given, that the problem body carries the message."""
    filename, content_type, payload = file_spec
    status, body = client.request_multipart("PUT", PROFILE_PICTURE_PATH, "file", filename, content_type, payload)
    assert_status(step, status, {expected}, results)
    if message is not None:
        assert_condition(f"{step}-message", message in body, f"expected {message!r} in {body[:200]!r}", results)


def has_profile_picture(client: HttpClient, results: list[StepResult], step: str) -> bool:
    """Reads GET /api/profile and returns its hasProfilePicture flag."""
    status, body = client.request_json("GET", "/api/profile")
    assert_status(step, status, {200}, results)
    return json.loads(body).get("hasProfilePicture") is True


def run_checks(base_url: str, origin: str, results: list[StepResult]) -> None:
    """Sign in, then exercise the upload contract: accepted types, rejections, ETag, size caps, request limits, deletion."""
    client, login = sign_in_with_available_login(base_url, origin, results)
    try:
        check_accepted_formats(client, results)
        check_stored_picture(client, login["personId"], results)
        check_rejections(client, results)
        check_size_and_request_limits(client, results)
    except Exception:
        # Best effort: leave no picture behind when a check failed, without masking that failure.
        client.request_json("DELETE", PROFILE_PICTURE_PATH)
        raise
    check_delete(client, results)

    logout_status, _ = client.request_json("POST", "/api/auth/logout")
    assert_status("logout", logout_status, {204}, results)


def check_accepted_formats(client: HttpClient, results: list[StepResult]) -> None:
    """PNG, JPEG and WebP all answer 200 and are stored as WebP, and the profile flag turns true."""
    larger_png = build_png(700, 500)
    assert_condition(
        "larger-png-exceeds-global-body-limit",
        len(larger_png) > GLOBAL_BODY_LIMIT_BYTES,
        f"The {len(larger_png)} byte fixture no longer outgrows the {GLOBAL_BODY_LIMIT_BYTES} byte body limit.",
        results,
    )

    cases = (
        ("png", ("valid-profile.png", "image/png", VALID_PNG_BYTES)),
        ("jpeg", ("valid-profile.jpg", "image/jpeg", VALID_JPEG_BYTES)),
        ("webp", ("valid-profile.webp", "image/webp", VALID_WEBP_BYTES)),
        ("larger-png", ("portrait.png", "image/png", larger_png)),
    )
    for name, file_spec in cases:
        upload(client, f"upload-{name}", file_spec, 200, "Profile picture updated.", results)
        status, headers = client.request_headers("GET", PROFILE_PICTURE_PATH)
        assert_status(f"get-after-{name}-upload", status, {200}, results)
        content_type = headers.get("Content-Type", "")
        assert_condition(f"{name}-is-stored-as-webp", content_type == "image/webp", f"got {content_type!r}", results)

    flagged = has_profile_picture(client, results, "profile-after-upload")
    assert_condition("profile-reports-the-picture", flagged, "hasProfilePicture stayed false after an upload.", results)


def check_stored_picture(client: HttpClient, person_id: int, results: list[StepResult]) -> None:
    """Cache headers and ETag round trip on the own route and on the id route (own id, always allowed)."""
    status, headers = client.request_headers("GET", PROFILE_PICTURE_PATH)
    assert_status("get-picture", status, {200}, results)
    cache_control = headers.get("Cache-Control", "")
    assert_condition(
        "picture-keeps-private-caching",
        "private" in cache_control and "max-age=3600" in cache_control and "no-store" not in cache_control,
        f"expected private, max-age=3600 and no no-store, got {cache_control!r}",
        results,
    )
    etag = headers.get("ETag", "")
    assert_condition("get-picture-has-etag", bool(etag), "expected an ETag header on the stored picture", results)

    for label, path in (("own", PROFILE_PICTURE_PATH), ("id", f"{PROFILE_PICTURE_PATH}/{person_id}")):
        match_status, _ = client.request_headers("GET", path, {"If-None-Match": etag})
        assert_status(f"{label}-route-etag-match", match_status, {304}, results)
        mismatch_status, _ = client.request_headers("GET", path, {"If-None-Match": '"not-the-stored-etag"'})
        assert_status(f"{label}-route-etag-mismatch", mismatch_status, {200}, results)

    _, id_headers = client.request_headers("GET", f"{PROFILE_PICTURE_PATH}/{person_id}")
    assert_condition("id-route-serves-the-same-etag", id_headers.get("ETag") == etag, "the id route sent another ETag", results)


def check_rejections(client: HttpClient, results: list[StepResult]) -> None:
    """Metadata problems are 400, content problems 422, each with its own message."""
    upload(client, "upload-empty-file", ("empty.png", "image/png", b""), 400, "File is empty.", results)
    upload(
        client, "upload-gif-content-type", ("anim.gif", "image/gif", b"GIF89a"), 400,
        "Only JPEG, PNG, and WebP images are allowed.", results,
    )
    upload(
        client, "upload-mime-mismatch", ("mismatch.png", "image/jpeg", VALID_PNG_BYTES), 422,
        "File content does not match the declared content type.", results,
    )
    upload(
        client, "upload-invalid-magic-bytes", ("not-image.png", "image/png", INVALID_TEXT_BYTES), 422,
        "File content is not a valid JPEG, PNG, or WebP image.", results,
    )
    upload(client, "upload-corrupt-png", ("corrupt.png", "image/png", CORRUPT_PNG_BYTES), 422, "could not be", results)

    status, _ = client.request_multipart("PUT", PROFILE_PICTURE_PATH, "other", "wrong-field.png", "image/png", VALID_PNG_BYTES)
    assert_status("upload-missing-file-field", status, {400}, results)

    status, _ = client.request_headers("GET", PROFILE_PICTURE_PATH)
    assert_status("rejected-uploads-keep-the-stored-picture", status, {200}, results)


def check_size_and_request_limits(client: HttpClient, results: list[StepResult]) -> None:
    """Over the 4 MB cap is refused (just over by the handler, way over by Kestrel); JSON bodies stop at 64 KB (413)."""
    just_over = build_png(600, 600).ljust(MAX_UPLOAD_BYTES + 1024, b"\x00")
    upload(client, "upload-just-over-limit", ("just-over.png", "image/png", just_over), 400, "maximum allowed size of 4 MB", results)

    oversize = build_png(600, 600).ljust(OVERSIZE_PAYLOAD_BYTES, b"\x00")
    status, _ = client.request_multipart("PUT", PROFILE_PICTURE_PATH, "file", "oversize.png", "image/png", oversize)
    assert_status("upload-oversize-body", status, {400, 413, CONNECTION_RESET_STATUS}, results)

    status, _ = client.request_json("PUT", "/api/profile", {"middleName": "a" * OVER_JSON_LIMIT_CHARS})
    assert_status("profile-json-over-body-limit", status, {413}, results)

    huge = build_blank_png(*OVER_MEGAPIXEL_DIMENSIONS)
    upload(client, "upload-over-megapixel-limit", ("huge.png", "image/png", huge), 422, "20 megapixels", results)


def check_delete(client: HttpClient, results: list[StepResult]) -> None:
    """DELETE answers 200 with its message, the picture is gone (404) and the profile flag is false again."""
    status, body = client.request_json("DELETE", PROFILE_PICTURE_PATH)
    assert_status("delete-picture", status, {200}, results)
    message = json.loads(body).get("message")
    assert_condition("delete-picture-message", message == "Profile picture removed.", f"got {message!r}", results)

    missing_status, _ = client.request_json("GET", PROFILE_PICTURE_PATH)
    assert_status("get-after-delete", missing_status, {404}, results)
    flagged = has_profile_picture(client, results, "profile-after-delete")
    assert_condition("profile-reports-no-picture", not flagged, "hasProfilePicture stayed true after the delete.", results)


if __name__ == "__main__":
    sys.exit(run_check(run_checks))
