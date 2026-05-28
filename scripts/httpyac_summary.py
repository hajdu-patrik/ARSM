"""HTTPYAC JSON summary extraction helpers for the local test runner."""

from __future__ import annotations

import json
import re
from typing import Iterable

HTTPYAC_SUMMARY_KEYS = ("totalRequests", "successRequests", "failedRequests", "erroredRequests")


def extract_http_summary(output: str) -> dict[str, object]:
    """Return a stable HTTPYAC request summary from command output."""
    payload = _extract_httpyac_payload(output)
    if not isinstance(payload, dict):
        regex_summary = _extract_http_summary_with_regex(output)
        if regex_summary is not None:
            return regex_summary
        return {"parseError": "HTTPYAC JSON output could not be parsed."}

    summary = payload.get("summary", {})
    if not isinstance(summary, dict):
        return {"parseError": "HTTPYAC summary payload was not found in command output."}

    return {
        "totalRequests": int(summary.get("totalRequests", 0) or 0),
        "successRequests": int(summary.get("successRequests", 0) or 0),
        "failedRequests": int(summary.get("failedRequests", 0) or 0),
        "erroredRequests": int(summary.get("erroredRequests", 0) or 0),
    }


def _extract_http_summary_with_regex(output: str) -> dict[str, int] | None:
    summary: dict[str, int] = {}

    for key in HTTPYAC_SUMMARY_KEYS:
        matches = re.findall(rf'"{key}"\s*:\s*(\d+)', output)
        if not matches:
            return None
        summary[key] = int(matches[-1])

    return summary


def _extract_httpyac_payload(output: str) -> dict[str, object] | None:
    payload = _extract_json_payload(output)
    if isinstance(payload, dict) and _has_httpyac_summary(payload):
        return payload

    return _select_best_httpyac_payload(_iter_json_object_candidates(output))


def _has_httpyac_summary(payload: dict[str, object]) -> bool:
    summary = payload.get("summary")
    return isinstance(summary, dict) and any(key in summary for key in HTTPYAC_SUMMARY_KEYS)


def _iter_json_object_candidates(output: str) -> Iterable[dict[str, object]]:
    decoder = json.JSONDecoder()

    for index, char in enumerate(output):
        if char != "{":
            continue

        try:
            candidate, _ = decoder.raw_decode(output[index:])
        except json.JSONDecodeError:
            continue

        if isinstance(candidate, dict):
            yield candidate


def _select_best_httpyac_payload(candidates: Iterable[dict[str, object]]) -> dict[str, object] | None:
    best_payload: dict[str, object] | None = None
    best_total_requests = -1

    for candidate in candidates:
        if not _has_httpyac_summary(candidate):
            continue

        total_requests = _httpyac_total_requests(candidate)
        if total_requests >= best_total_requests:
            best_total_requests = total_requests
            best_payload = candidate

    return best_payload


def _httpyac_total_requests(payload: dict[str, object]) -> int:
    summary = payload.get("summary")
    if not isinstance(summary, dict):
        return 0

    try:
        return int(summary.get("totalRequests", 0) or 0)
    except (TypeError, ValueError):
        return 0


def _extract_json_payload(output: str) -> dict[str, object] | None:
    try:
        payload = json.loads(output)
        if isinstance(payload, dict):
            return payload
    except json.JSONDecodeError:
        pass

    decoder = json.JSONDecoder()
    for index, char in enumerate(output):
        if char != "{":
            continue

        try:
            payload, _ = decoder.raw_decode(output[index:])
        except json.JSONDecodeError:
            continue

        if isinstance(payload, dict):
            return payload

    return None