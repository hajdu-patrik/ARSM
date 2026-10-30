#!/usr/bin/env python3
"""Replays issued cookies: a rotated refresh cookie inside the 30 s window is tolerated, but nothing works after logout."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from http_check_runner import run_check, sign_in  # noqa: E402
from http_check_support import (  # noqa: E402
    CSRF_COOKIE_NAME,
    CSRF_HEADER_NAME,
    REFRESH_COOKIE_NAME,
    HttpClient,
    StepResult,
    assert_condition,
    assert_status,
    read_admin_credentials,
)

# The replay after the 30 s window (401, chain revoked) is a known gap: it would need a 30 s wait.
REFRESH_PATH = "/api/auth/refresh"
VALIDATE_PATH = "/api/auth/validate"
ACCESS_COOKIE_NAME = "__Host-arsm-access-token"


def replay_refresh(
    base_url: str, origin: str, refresh: str | None, csrf: str | None,
) -> tuple[int, dict[str, str]]:
    """Sends the given refresh and CSRF cookies on a fresh client, as another tab or an attacker holding them would."""
    return HttpClient(base_url, origin).request_headers(
        "POST",
        REFRESH_PATH,
        {"Cookie": f"{REFRESH_COOKIE_NAME}={refresh}; {CSRF_COOKIE_NAME}={csrf}", CSRF_HEADER_NAME: csrf or ""},
    )


def check_replay_inside_window(
    base_url: str, origin: str, stale_refresh: str | None, stale_csrf: str | None, results: list[StepResult],
) -> None:
    """The pre-rotation cookies replayed right after the rotation answer 204 and issue nothing."""
    status, headers = replay_refresh(base_url, origin, stale_refresh, stale_csrf)
    assert_status("replay-inside-window-is-tolerated", status, {204}, results)
    assert_condition(
        "replay-sets-no-cookies",
        not any(name.lower() == "set-cookie" for name in headers),
        f"The tolerated replay must not issue cookies; got headers {sorted(headers)}.",
        results,
    )


def check_replay_after_logout(
    base_url: str, origin: str, session: dict[str, str | None], results: list[StepResult],
) -> None:
    """After logout the access token is denylisted and both refresh cookies (stale and rotated) are dead."""
    status, _ = HttpClient(base_url, origin).request_headers(
        "GET", VALIDATE_PATH, {"Cookie": f"{ACCESS_COOKIE_NAME}={session['access']}"},
    )
    assert_status("logged-out-access-token-is-denylisted", status, {401}, results)

    status, _ = replay_refresh(base_url, origin, session["rotated_refresh"], session["rotated_csrf"])
    assert_status("logged-out-refresh-cookie-is-revoked", status, {401}, results)

    status, _ = replay_refresh(base_url, origin, session["stale_refresh"], session["stale_csrf"])
    assert_status("stale-cookie-without-live-successor-is-reuse", status, {401}, results)


def run_checks(base_url: str, origin: str, results: list[StepResult]) -> None:
    """Rotates a session once, replays the old cookies, logs out, and replays everything again."""
    client, _ = sign_in(base_url, origin, read_admin_credentials(), "login", results)
    session: dict[str, str | None] = {
        "stale_refresh": client.cookie_value(REFRESH_COOKIE_NAME),
        "stale_csrf": client.cookie_value(CSRF_COOKIE_NAME),
    }
    try:
        assert_condition(
            "login-issues-refresh-and-csrf-cookies",
            bool(session["stale_refresh"] and session["stale_csrf"]),
            "The login response carried no refresh or CSRF cookie.",
            results,
        )

        status, _ = client.request_headers("POST", REFRESH_PATH)
        assert_status("refresh-rotates-the-session", status, {204}, results)
        session["rotated_refresh"] = client.cookie_value(REFRESH_COOKIE_NAME)
        session["rotated_csrf"] = client.cookie_value(CSRF_COOKIE_NAME)
        assert_condition(
            "refresh-rotates-refresh-and-csrf-cookies",
            bool(session["rotated_refresh"]) and session["rotated_refresh"] != session["stale_refresh"]
            and session["rotated_csrf"] != session["stale_csrf"],
            "The refresh did not rotate the refresh and CSRF cookies.",
            results,
        )

        check_replay_inside_window(base_url, origin, session["stale_refresh"], session["stale_csrf"], results)

        status, _ = client.request_json("GET", VALIDATE_PATH)
        assert_status("rotated-session-stays-valid", status, {200}, results)
        session["access"] = client.cookie_value(ACCESS_COOKIE_NAME)
    except Exception:
        # Best-effort sign-out only, so the original failure is the one reported.
        client.request_json("POST", "/api/auth/logout")
        raise

    status, _ = client.request_json("POST", "/api/auth/logout")
    assert_status("logout", status, {204}, results)
    check_replay_after_logout(base_url, origin, session, results)


if __name__ == "__main__":
    sys.exit(run_check(run_checks))
