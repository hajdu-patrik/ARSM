#!/usr/bin/env python3
"""Profile-picture fixtures for the profile endpoint checks: the picture route and structurally valid PNG builders."""

from __future__ import annotations

import base64
import struct
import zlib

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


def build_jpeg() -> bytes:
    """Build a baseline 1x1 grayscale JPEG: single-code Huffman tables and one flat block, so no codec library is needed."""
    quantization = b"\xff\xdb\x00\x43\x00" + b"\x01" * 64
    frame = b"\xff\xc0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00"
    single_code_table = b"\x01" + b"\x00" * 15 + b"\x00"
    dc_table = b"\xff\xc4\x00\x14\x00" + single_code_table
    ac_table = b"\xff\xc4\x00\x14\x10" + single_code_table
    scan = b"\xff\xda\x00\x08\x01\x01\x00\x00\x3f\x00" + b"\x3f"
    return b"\xff\xd8" + quantization + frame + dc_table + ac_table + scan + b"\xff\xd9"


# A lossless 1x1 WebP (the well-known feature-detection image), decoded once at import.
VALID_WEBP_BYTES = base64.b64decode("UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==")

# Passes the magic-byte check but is no decodable image, so the decode step has to refuse it.
CORRUPT_PNG_BYTES = b"\x89PNG\r\n\x1a\n" + b"corrupt-body-after-signature"

VALID_PNG_BYTES = build_png(1, 1)
VALID_JPEG_BYTES = build_jpeg()
