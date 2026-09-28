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

def extract_failed_http_requests(output: str, limit: int = 400) -> list[dict[str, object]]:
    """Return failed/errored HTTPYAC requests (file, line, title, status only - see scripts/CLAUDE.md)."""
    payload = _extract_httpyac_payload(output)
    requests = payload.get("requests") if isinstance(payload, dict) else None
    if not isinstance(requests, list):
        return _extract_failed_http_requests_with_regex(output, limit)

    failed: list[dict[str, object]] = []
    for request in requests:
        if not isinstance(request, dict):
            continue
        tests = request.get("testResults") if isinstance(request.get("testResults"), list) else []
        broken = [test for test in tests if isinstance(test, dict) and test.get("status") in ("FAILED", "ERROR")]
        if not broken:
            continue
        response = request.get("response") if isinstance(request.get("response"), dict) else {}
        failed.append({
            "file": str(request.get("fileName", "")).replace("\\", "/"),
            "line": request.get("line"),
            "title": request.get("title") or request.get("name"),
            "actualStatus": response.get("statusCode"),
            "failedTests": [str(test.get("message", ""))[:200] for test in broken],
        })
        if len(failed) >= limit:
            break
    return failed


REQUEST_SEGMENT_START = re.compile(r'"fileName"\s*:\s*"')
SEGMENT_FILE = re.compile(r'^"fileName"\s*:\s*"(?P<file>[^"]*)"')
SEGMENT_LINE_TITLE = re.compile(r'"line"\s*:\s*(?P<line>\d+)\s*,\s*"title"\s*:\s*(?P<title>"(?:[^"\\]|\\.)*"|null)')
SEGMENT_STATUS = re.compile(r'"statusCode"\s*:\s*(?P<status>\d+)')
SEGMENT_BROKEN_TEST = re.compile(r'"message"\s*:\s*"(?P<message>(?:[^"\\]|\\.)*)"\s*,\s*"status"\s*:\s*"(?:FAILED|ERROR)"')


def _extract_failed_http_requests_with_regex(output: str, limit: int) -> list[dict[str, object]]:
    """Regex fallback for sanitizer-mangled JSON; each "fileName"-starting segment parses independently
    so no field is borrowed from a neighboring request."""
    starts = [match.start() for match in REQUEST_SEGMENT_START.finditer(output)]
    failed: list[dict[str, object]] = []
    for index, start in enumerate(starts):
        segment = output[start:starts[index + 1] if index + 1 < len(starts) else len(output)]
        file_match = SEGMENT_FILE.match(segment)
        line_title = SEGMENT_LINE_TITLE.search(segment)
        if not file_match or not line_title:
            continue
        raw_title = line_title.group("title")
        try:
            title = json.loads(raw_title)
        except json.JSONDecodeError:
            title = raw_title.strip('"')
        status = SEGMENT_STATUS.search(segment)
        failed.append({
            "file": file_match.group("file").replace("\\", "/"),
            "line": int(line_title.group("line")),
            "title": title,
            "actualStatus": int(status.group("status")) if status else None,
            "failedTests": [match.group("message")[:200] for match in SEGMENT_BROKEN_TEST.finditer(segment)][:5],
        })
        if len(failed) >= limit:
            break
    return failed
