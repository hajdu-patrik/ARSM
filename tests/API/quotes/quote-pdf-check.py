#!/usr/bin/env python3
"""Checks GET /api/quotes/{id}/pdf: the one quote route with a binary body, unreachable from httpyac."""

from __future__ import annotations

import json
import os
import ssl
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from http_check_support import (  # noqa: E402
    HttpClient,
    StepResult,
    assert_condition,
    assert_status,
    find_anchor_quote,
    read_allowed_origin,
    read_credentials,
)

QUOTES_PATH = "/api/quotes"

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


def assert_pdf_content(pdf_bytes: bytes, headers: dict[str, str], quote_number: str, results: list[StepResult]) -> None:
    """Asserts the response is a real PDF, named after the quote, with legible Hungarian text."""
    content_type = headers.get("Content-Type", headers.get("content-type", ""))
    assert_condition(
        "pdf-content-type",
        content_type.startswith("application/pdf"),
        f"Expected application/pdf, got '{content_type}'.",
        results,
    )

    disposition = headers.get("Content-Disposition", headers.get("content-disposition", ""))
    assert_condition(
        "pdf-file-name",
        quote_number in disposition,
        f"Content-Disposition should name the quote; got '{disposition}'.",
        results,
    )

    assert_condition(
        "pdf-signature",
        pdf_bytes.startswith(b"%PDF-"),
        "Response body does not start with the %PDF- signature.",
        results,
    )

    assert_condition(
        "pdf-size",
        len(pdf_bytes) >= MINIMUM_PDF_BYTES,
        f"PDF is only {len(pdf_bytes)} bytes, below the {MINIMUM_PDF_BYTES} byte floor.",
        results,
    )

    text = extract_pdf_text(pdf_bytes)
    if text is None:
        results.append(StepResult(step="pdf-accented-text", expected=[200], actual=200, status="skipped"))
        return

    assert_condition(
        "pdf-accented-text",
        "Árajánlat" in text,
        "The extracted text does not contain the accented word 'Árajánlat'; the embedded font is suspect.",
        results,
    )

    assert_condition(
        "pdf-quote-number",
        quote_number in text,
        f"The extracted text does not contain the quote number {quote_number}.",
        results,
    )


def run_checks(client: HttpClient, results: list[StepResult]) -> None:
    """Downloads the fixture anchor quote as a PDF and asserts the failure paths."""
    anchor = find_anchor_quote(client, results)
    quote_id = int(anchor["id"])

    status, pdf_bytes, headers = client.request_binary("GET", f"{QUOTES_PATH}/{quote_id}/pdf")
    assert_status("download-pdf", status, {200}, results)
    assert_pdf_content(pdf_bytes, headers, str(anchor["quoteNumber"]), results)

    missing_status, _, _ = client.request_binary("GET", f"{QUOTES_PATH}/{NON_EXISTENT_QUOTE_ID}/pdf")
    assert_status("missing-quote-pdf", missing_status, {404}, results)

    client.request_json("POST", "/api/auth/logout")
    unauthenticated_status, _, _ = client.request_binary("GET", f"{QUOTES_PATH}/{quote_id}/pdf")
    assert_status("unauthenticated-pdf", unauthenticated_status, {401}, results)


def main() -> int:
    """Authenticates, runs the checks, and prints the sanitized report."""
    base_url = os.getenv("AutoService_ApiService_HostAddress", "").strip()
    if not base_url:
        raise RuntimeError("Missing AutoService_ApiService_HostAddress environment variable.")

    # The local API uses a development certificate.
    ssl._create_default_https_context = ssl._create_unverified_context  # noqa: SLF001

    results: list[StepResult] = []
    login_attempt_statuses: list[int] = []

    for credential in read_credentials():
        results.clear()
        client = HttpClient(base_url, read_allowed_origin())
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
        run_checks(client, results)
        break
    else:
        if login_attempt_statuses and all(status == 429 for status in login_attempt_statuses):
            print(json.dumps({
                "status": "skipped",
                "reason": "All available credentials were rate-limited during login.",
                "checks": [result.__dict__ for result in results],
            }, ensure_ascii=False))
            return 0

        raise RuntimeError(
            f"Quote PDF checks could not authenticate. Login statuses: {login_attempt_statuses}",
        )

    print(json.dumps({"status": "passed", "checks": [result.__dict__ for result in results]}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
