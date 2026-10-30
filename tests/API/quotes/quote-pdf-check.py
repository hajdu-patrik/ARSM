#!/usr/bin/env python3
"""Checks GET /api/quotes/{id}/pdf: the one quote route with a binary body, unreachable from httpyac."""

from __future__ import annotations

import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from http_check_runner import run_check, sign_in_with_available_login  # noqa: E402
from http_check_support import (  # noqa: E402
    HttpClient,
    StepResult,
    assert_condition,
    assert_status,
    find_anchor_quote,
)

QUOTES_PATH = "/api/quotes"
VEHICLES_PATH = "/api/vehicles"

# A quote PDF carries a logo, an embedded font subset and several sections, so anything
# this small is a truncated or empty document rather than a real one.
MINIMUM_PDF_BYTES = 3000

NON_EXISTENT_QUOTE_ID = 999999


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


def check_anchor_pdf(client: HttpClient, anchor: dict, results: list[StepResult]) -> None:
    """Downloads the read-only anchor quote: a draft whose paper says so, in Hungarian."""
    quote_id = int(anchor["id"])
    status, pdf_bytes, headers = client.request_binary("GET", f"{QUOTES_PATH}/{quote_id}/pdf")
    assert_status("download-pdf", status, {200}, results)
    assert_pdf_envelope(pdf_bytes, headers, str(anchor["quoteNumber"]), "pdf", results)

    words = ["Árajánlat", str(anchor["quoteNumber"]), "Piszkozat", "Ügyfél", "Jármű"]
    assert_pdf_words(extract_pdf_text(pdf_bytes), words, "pdf", results)


def check_disposable_pdf(client: HttpClient, vehicle_id: int, results: list[StepResult]) -> None:
    """Prints a disposable draft with notes and a free-form line, then proves a deleted quote has no PDF."""
    status, body = client.request_json(
        "POST",
        f"{VEHICLES_PATH}/{vehicle_id}/quotes",
        {"title": f"Ékezetes próba {int(time.time())}", "notes": "Megjegyzés Próbaszöveg"},
    )
    assert_status("create-pdf-fixture", status, {201}, results)
    quote = json.loads(body)
    quote_id = int(quote["id"])
    version = int(quote["version"])

    try:
        status, body = client.request_json(
            "POST",
            f"{QUOTES_PATH}/{quote_id}/lines",
            {
                "lineKind": "Part",
                "quantity": 2,
                "description": "Szabadkézi tétel",
                "netUnitPrice": 1000,
                "vatRatePercent": 27,
                "version": version,
            },
        )
        assert_status("add-pdf-fixture-line", status, {201}, results)
        quote = json.loads(body)
        version = int(quote["version"])

        status, pdf_bytes, headers = client.request_binary("GET", f"{QUOTES_PATH}/{quote_id}/pdf")
        assert_status("download-draft-pdf", status, {200}, results)
        assert_pdf_envelope(pdf_bytes, headers, str(quote["quoteNumber"]), "draft-pdf", results)
        words = ["Piszkozat", "Szabadkézi", "Megjegyzés", "Próbaszöveg", "Készítette"]
        assert_pdf_words(extract_pdf_text(pdf_bytes), words, "draft-pdf", results)
    finally:
        # Best-effort cleanup; the assertion on the delete itself follows below on the success path.
        status, _ = client.request_json("DELETE", f"{QUOTES_PATH}/{quote_id}?version={version}")

    assert_status("delete-pdf-fixture", status, {204}, results)
    gone_status, _, _ = client.request_binary("GET", f"{QUOTES_PATH}/{quote_id}/pdf")
    assert_status("deleted-quote-pdf", gone_status, {404}, results)


def run_checks(base_url: str, origin: str, results: list[StepResult]) -> None:
    """Signs in, downloads the anchor and a disposable quote as PDF and asserts the failure paths."""
    client, _ = sign_in_with_available_login(base_url, origin, results)
    anchor = find_anchor_quote(client, results)
    quote_id = int(anchor["id"])

    check_anchor_pdf(client, anchor, results)
    check_disposable_pdf(client, int(anchor["vehicleId"]), results)

    missing_status, _, _ = client.request_binary("GET", f"{QUOTES_PATH}/{NON_EXISTENT_QUOTE_ID}/pdf")
    assert_status("missing-quote-pdf", missing_status, {404}, results)

    client.request_json("POST", "/api/auth/logout")
    unauthenticated_status, _, _ = client.request_binary("GET", f"{QUOTES_PATH}/{quote_id}/pdf")
    assert_status("unauthenticated-pdf", unauthenticated_status, {401}, results)


if __name__ == "__main__":
    sys.exit(run_check(run_checks))
