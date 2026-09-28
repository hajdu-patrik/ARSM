#!/usr/bin/env python3
"""Profile-picture fixtures for the profile endpoint checks (re-exports shared helpers from http_check_support)."""

from __future__ import annotations

import struct
import sys
import zlib
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from http_check_support import (  # noqa: E402
    APPLICATION_JSON,
    CONNECTION_RESET_STATUS,
    UNSAFE_HTTP_METHODS,
    Credentials,
    HttpClient,
    StepResult,
    assert_condition,
    assert_status,
    read_allowed_origin,
    read_credentials,
)

__all__ = [
    "APPLICATION_JSON",
    "CONNECTION_RESET_STATUS",
    "INVALID_TEXT_BYTES",
    "PROFILE_PICTURE_PATH",
    "UNSAFE_HTTP_METHODS",
    "VALID_PNG_BYTES",
    "Credentials",
    "HttpClient",
    "StepResult",
    "assert_condition",
    "assert_status",
    "build_png",
    "read_allowed_origin",
    "read_credentials",
]

PROFILE_PICTURE_PATH = "/api/profile/picture"

INVALID_TEXT_BYTES = b"not-an-image-payload"


def build_png(width: int, height: int) -> bytes:
    """Build a structurally valid RGBA PNG with correct chunk CRCs, since the upload path decodes and re-encodes every image."""

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
