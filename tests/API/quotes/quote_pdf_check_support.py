#!/usr/bin/env python3
"""Shared steps of quote-pdf-check.py: the PDF envelope and text assertions and the unsupported-glyph quote."""

from __future__ import annotations

import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from http_check_runner import sign_in  # noqa: E402
from http_check_support import (  # noqa: E402
    HttpClient,
    StepResult,
    assert_condition,
    assert_status,
    read_admin_credentials,
)

QUOTES_PATH = "/api/quotes"
VEHICLES_PATH = "/api/vehicles"
CUSTOMERS_PATH = "/api/customers"

# A quote PDF carries a logo, an embedded font subset and several sections, so anything
# this small is a truncated or empty document rather than a real one.
MINIMUM_PDF_BYTES = 3000

# A check mark, an emoji and a CJK character: none is in the embedded Noto Sans, each prints as '?' (never a 500).
UNSUPPORTED_GLYPHS = "✓ 😀 油"


def extract_pdf_text(pdf_bytes: bytes) -> str | None:
    """Extracts the document text, or returns None when no extractor is installed."""
    try:
        from pypdf import PdfReader  # noqa: PLC0415
    except ImportError:
        return None

    from io import BytesIO  # noqa: PLC0415

    reader = PdfReader(BytesIO(pdf_bytes))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def assert_pdf_envelope(pdf_bytes: bytes, headers: dict[str, str], quote_number: str, prefix: str, results: list[StepResult]) -> None:
    """Asserts the response is a real PDF whose file name is exactly the quote number."""
    content_type = headers.get("Content-Type", headers.get("content-type", ""))
    assert_condition(
        f"{prefix}-content-type",
        content_type.startswith("application/pdf"),
        f"Expected application/pdf, got '{content_type}'.",
        results,
    )

    disposition = headers.get("Content-Disposition", headers.get("content-disposition", ""))
    assert_condition(
        f"{prefix}-file-name",
        f"{quote_number}.pdf" in disposition,
        f"Content-Disposition should name the file {quote_number}.pdf; got '{disposition}'.",
        results,
    )

    assert_condition(
        f"{prefix}-signature",
        pdf_bytes.startswith(b"%PDF-"),
        "Response body does not start with the %PDF- signature.",
        results,
    )

    assert_condition(
        f"{prefix}-size",
        len(pdf_bytes) >= MINIMUM_PDF_BYTES,
        f"PDF is only {len(pdf_bytes)} bytes, below the {MINIMUM_PDF_BYTES} byte floor.",
        results,
    )


def assert_pdf_words(text: str | None, words: list[str], prefix: str, results: list[StepResult]) -> None:
    """Asserts every word is in the extracted text; the step reports skipped when no extractor is installed."""
    if text is None:
        results.append(StepResult(step=f"{prefix}-text", expected=[200], actual=200, status="skipped"))
        return

    missing = [word for word in words if word not in text]
    assert_condition(
        f"{prefix}-text",
        not missing,
        f"The extracted text does not contain {missing}; the embedded font or the model mapping is suspect.",
        results,
    )


def assert_unsupported_glyphs_replaced(text: str | None, prefix: str, results: list[StepResult]) -> None:
    """Asserts '?' stands where the glyphs were and none of them reached the text; skipped without an extractor."""
    if text is None:
        results.append(StepResult(step=f"{prefix}-glyphs", expected=[200], actual=200, status="skipped"))
        return

    leftover = [glyph for glyph in UNSUPPORTED_GLYPHS.split() if glyph in text]
    assert_condition(
        f"{prefix}-glyphs",
        "?" in text and not leftover,
        f"Expected '?' in place of the unsupported glyphs; leftover glyphs: {ascii(leftover)}.",
        results,
    )


def create_glyph_fixture(client: HttpClient, suffix: str, results: list[StepResult]) -> tuple[int, int]:
    """Creates the disposable customer and vehicle; returns their ids."""
    status, body = client.request_json("POST", CUSTOMERS_PATH, {
        "firstName": "PdfGlyph", "middleName": None, "lastName": "Fixture",
        "email": f"quote.pdfglyph.{suffix}@example.test", "phoneNumber": None,
    })
    assert_status("create-glyph-customer", status, {201}, results)
    customer_id = int(json.loads(body)["id"])

    status, body = client.request_json("POST", f"{CUSTOMERS_PATH}/{customer_id}/vehicles", {
        "licensePlate": f"QPG-{suffix}", "vin": f"TST{suffix[-10:]}0749", "brand": "Skoda", "model": "Octavia",
        "year": 2020, "mileageKm": 45000, "enginePowerKw": 110, "drivetrainType": "Petrol",
    })
    assert_status("create-glyph-vehicle", status, {201}, results)
    return customer_id, int(json.loads(body)["id"])


def render_glyph_quote(client: HttpClient, vehicle_id: int, suffix: str, results: list[StepResult]) -> None:
    """Draft with the glyphs in title, notes and a free-form line renders; Draft to Sent renders the same text."""
    status, body = client.request_json("POST", f"{VEHICLES_PATH}/{vehicle_id}/quotes", {
        "title": f"Szűrő {UNSUPPORTED_GLYPHS} {suffix}", "notes": f"Köszönjük {UNSUPPORTED_GLYPHS}",
    })
    assert_status("create-glyph-quote", status, {201}, results)
    quote = json.loads(body)

    status, body = client.request_json("POST", f"{QUOTES_PATH}/{quote['id']}/lines", {
        "lineKind": "Part", "quantity": 1, "description": f"Olajszűrő {UNSUPPORTED_GLYPHS}",
        "netUnitPrice": 1000, "vatRatePercent": 27, "version": quote["version"],
    })
    assert_status("add-glyph-line", status, {201}, results)
    quote = json.loads(body)

    status, pdf_bytes, headers = client.request_binary("GET", f"{QUOTES_PATH}/{quote['id']}/pdf")
    assert_status("download-glyph-pdf", status, {200}, results)
    assert_pdf_envelope(pdf_bytes, headers, str(quote["quoteNumber"]), "glyph-pdf", results)
    text = extract_pdf_text(pdf_bytes)
    assert_pdf_words(text, ["Olajszűrő", "Köszönjük"], "glyph-pdf", results)
    assert_unsupported_glyphs_replaced(text, "glyph-pdf", results)

    status, body = client.request_json(
        "POST", f"{QUOTES_PATH}/{quote['id']}/status", {"status": "Sent", "version": quote["version"]},
    )
    assert_status("send-glyph-quote", status, {200}, results)
    assert_condition("glyph-quote-sent", json.loads(body)["status"] == "Sent", "The quote is not Sent.", results)


def check_unsupported_glyph_quote(base_url: str, origin: str, results: list[StepResult]) -> None:
    """Admin session, because a Sent quote is only removed with its disposable customer."""
    client, _ = sign_in(base_url, origin, read_admin_credentials(), "glyph-admin-login", results)
    suffix = str(int(time.time()))
    customer_id, vehicle_id = create_glyph_fixture(client, suffix, results)

    try:
        render_glyph_quote(client, vehicle_id, suffix, results)
    finally:
        status, _ = client.request_json("DELETE", f"{CUSTOMERS_PATH}/{customer_id}")

    assert_status("delete-glyph-customer", status, {204}, results)
