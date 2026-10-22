#!/usr/bin/env python3
"""Checks that a refresh cookie replayed inside the 30 s grace window gets 204 and no cookies, and the rotated session stays valid."""

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

# Only the replay inside the 30 s window is checked: the one after it (401, chain revoked) would need a 30 s wait.
REFRESH_PATH = "/api/auth/refresh"


def replay_stale_refresh_cookie(
    base_url: str, origin: str, stale_refresh: str | None, stale_csrf: str | None, results: list[StepResult],
) -> None:
    """Sends the cookies from before the rotation on a fresh client, as a second browser tab holding them would."""
    replayer = HttpClient(base_url, origin)
    status, headers = replayer.request_headers(
        "POST",
        REFRESH_PATH,
        {
            "Cookie": f"{REFRESH_COOKIE_NAME}={stale_refresh}; {CSRF_COOKIE_NAME}={stale_csrf}",
            CSRF_HEADER_NAME: stale_csrf or "",
        },
    )
    assert_status("replay-inside-window-is-tolerated", status, {204}, results)
    assert_condition(
        "replay-sets-no-cookies",
        not any(name.lower() == "set-cookie" for name in headers),
        f"The tolerated replay must not issue cookies; got headers {sorted(headers)}.",
        results,
    )


def run_checks(base_url: str, origin: str, results: list[StepResult]) -> None:
    """Rotates a session once, replays the pre-rotation cookie, and asserts the rotated session still works."""
    client, _ = sign_in(base_url, origin, read_admin_credentials(), "login", results)
    try:
        stale_refresh = client.cookie_value(REFRESH_COOKIE_NAME)
        stale_csrf = client.cookie_value(CSRF_COOKIE_NAME)
        assert_condition(
            "login-issues-refresh-and-csrf-cookies",
            bool(stale_refresh and stale_csrf),
            "The login response carried no refresh or CSRF cookie.",
            results,
        )

        status, _ = client.request_headers("POST", REFRESH_PATH)
        assert_status("refresh-rotates-the-session", status, {204}, results)
        rotated_refresh = client.cookie_value(REFRESH_COOKIE_NAME)
        assert_condition(
            "refresh-issues-a-new-refresh-cookie",
            bool(rotated_refresh) and rotated_refresh != stale_refresh,
            "The refresh did not rotate the refresh cookie.",
            results,
        )

        replay_stale_refresh_cookie(base_url, origin, stale_refresh, stale_csrf, results)

        status, _ = client.request_json("GET", "/api/auth/validate")
        assert_status("rotated-session-stays-valid", status, {200}, results)
    except Exception:
        # Best-effort sign-out only, so the original failure is the one reported.
        client.request_json("POST", "/api/auth/logout")
        raise

    status, _ = client.request_json("POST", "/api/auth/logout")
    assert_status("logout", status, {204}, results)


if __name__ == "__main__":
    sys.exit(run_check(run_checks))
