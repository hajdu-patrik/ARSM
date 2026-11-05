#!/usr/bin/env python3
"""Checks GET /api/quotes/{id}/pdf: the one quote route with a binary body, unreachable from httpyac."""

from __future__ import annotations

import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from http_check_runner import run_check, sign_in_with_available_login  # noqa: E402
from http_check_support import (  # noqa: E402
    HttpClient,
    StepResult,
    assert_status,
    find_anchor_quote,
)
from quote_pdf_check_support import (  # noqa: E402
    QUOTES_PATH,
    VEHICLES_PATH,
    assert_pdf_envelope,
    assert_pdf_words,
    check_unsupported_glyph_quote,
    extract_pdf_text,
)

NON_EXISTENT_QUOTE_ID = 999999


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
    """Signs in, downloads the anchor and disposable quotes as PDF (also with glyphs the font lacks) and asserts the failure paths."""
    client, _ = sign_in_with_available_login(base_url, origin, results)
    anchor = find_anchor_quote(client, results)
    quote_id = int(anchor["id"])

    check_anchor_pdf(client, anchor, results)
    check_disposable_pdf(client, int(anchor["vehicleId"]), results)
    check_unsupported_glyph_quote(base_url, origin, results)

    missing_status, _, _ = client.request_binary("GET", f"{QUOTES_PATH}/{NON_EXISTENT_QUOTE_ID}/pdf")
    assert_status("missing-quote-pdf", missing_status, {404}, results)

    client.request_json("POST", "/api/auth/logout")
    unauthenticated_status, _, _ = client.request_binary("GET", f"{QUOTES_PATH}/{quote_id}/pdf")
    assert_status("unauthenticated-pdf", unauthenticated_status, {401}, results)


if __name__ == "__main__":
    sys.exit(run_check(run_checks))
