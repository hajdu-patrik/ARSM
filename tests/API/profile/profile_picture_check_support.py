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
    "build_blank_png",
    "build_png",
    "read_allowed_origin",
    "read_credentials",
]

PROFILE_PICTURE_PATH = "/api/profile/picture"

INVALID_TEXT_BYTES = b"not-an-image-payload"


def _assemble_png(width: int, height: int, compressed_rows: bytes) -> bytes:
    """Wrap zlib-compressed RGBA scanlines into PNG chunks with correct CRCs."""

    def chunk(tag: bytes, data: bytes) -> bytes:
        body = tag + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body) & 0xFFFFFFFF)

    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
        + chunk(b"IDAT", compressed_rows)
        + chunk(b"IEND", b"")
    )


def build_png(width: int, height: int) -> bytes:
    """Build a structurally valid RGBA PNG with correct chunk CRCs, since the upload path decodes and re-encodes every image."""
    raw = b"".join(
        b"\x00" + b"".join(bytes([(x * 7) % 256, (y * 5) % 256, 128, 255]) for x in range(width))
        for y in range(height)
    )
    return _assemble_png(width, height, zlib.compress(raw, 6))


def build_blank_png(width: int, height: int) -> bytes:
    """Build a valid blank RGBA PNG of any dimensions, streaming the scanlines so the raw pixels are never held in memory."""
    compressor = zlib.compressobj(9)
    scanline = b"\x00" * (1 + width * 4)
    compressed = b"".join(compressor.compress(scanline) for _ in range(height)) + compressor.flush()
    return _assemble_png(width, height, compressed)


VALID_PNG_BYTES = build_png(1, 1)
