#!/usr/bin/env python3
"""Checks that a password change, an admin reset, an admin delete and a self delete end the person's sessions at once."""

from __future__ import annotations

import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from http_check_runner import run_check, sign_in  # noqa: E402
from http_check_support import (  # noqa: E402
    Credentials,
    HttpClient,
    StepResult,
    assert_condition,
    assert_status,
    read_admin_credentials,
    read_required_env,
)

VALIDATE_PATH = "/api/auth/validate"
CHANGE_PASSWORD_PATH = "/api/profile/change-password"
MECHANICS_PATH = "/api/admin/mechanics"


def register_mechanic(admin: HttpClient, label: str, password: str, results: list[StepResult]) -> tuple[Credentials, int]:
    """Registers a disposable mechanic on a run-unique @example.test address (a prefix the purge suite knows)."""
    email = f"session.revocation.{label}.{int(time.time())}@example.test"
    status, body = admin.request_json(
        "POST",
        "/api/auth/register",
        {
            "firstName": "Session",
            "lastName": "Revocation",
            "email": email,
            "password": password,
            "personType": "Mechanic",
            "specialization": "GasolineAndDiesel",
            "expertise": ["Engine"],
        },
    )
    assert_status(f"register-{label}-mechanic", status, {200}, results)
    return Credentials(email, password), int(json.loads(body)["personId"])


def change_password(client: HttpClient, current: str, new: str, step: str, results: list[StepResult]) -> None:
    """Changes the signed-in mechanic's password, which also rotates this client's cookies."""
    payload = {"currentPassword": current, "newPassword": new, "confirmNewPassword": new}
    status, _ = client.request_json("POST", CHANGE_PASSWORD_PATH, payload)
    assert_status(step, status, {200}, results)


def assert_validate_status(client: HttpClient, step: str, expected: int, results: list[StepResult]) -> None:
    """Asserts what the session check answers for the client's current cookies."""
    status, _ = client.request_json("GET", VALIDATE_PATH)
    assert_status(step, status, {expected}, results)


def check_password_change_reset_and_delete(
    base_url: str, origin: str, admin: HttpClient, passwords: tuple[str, str], results: list[StepResult], created: list[int],
) -> None:
    """Walks one mechanic through a self password change, an admin reset with forced change, and an admin delete."""
    password, other_password = passwords
    credentials, person_id = register_mechanic(admin, "change", password, results)
    created.append(person_id)
    session_a, login = sign_in(base_url, origin, credentials, "login-session-a", results)
    session_b, _ = sign_in(base_url, origin, credentials, "login-session-b", results)
    assert_condition("fresh-mechanic-is-not-flagged", login.get("mustChangePassword") is False, f"login body: {login}", results)

    status, headers = session_b.request_headers("GET", VALIDATE_PATH)
    assert_status("validate-session-b", status, {200}, results)
    cache_control = headers.get("Cache-Control", "")
    assert_condition("json-responses-are-no-store", "no-store" in cache_control, f"Cache-Control was {cache_control!r}.", results)

    change_password(session_a, password, other_password, "change-password-in-session-a", results)
    assert_validate_status(session_b, "other-session-ended-by-password-change", 401, results)
    assert_validate_status(session_a, "changing-session-survives", 200, results)

    session_c, _ = sign_in(base_url, origin, Credentials(credentials.email, other_password), "login-with-new-password", results)
    status, _ = admin.request_json("POST", f"{MECHANICS_PATH}/{person_id}/password-reset", {"temporaryPassword": password})
    assert_status("admin-password-reset", status, {204}, results)
    assert_validate_status(session_c, "session-ended-by-admin-reset", 401, results)
    assert_validate_status(session_a, "changing-session-ended-by-admin-reset", 401, results)

    session_d, flagged = sign_in(base_url, origin, credentials, "login-with-temporary-password", results)
    assert_condition("temporary-login-is-flagged", flagged.get("mustChangePassword") is True, f"login body: {flagged}", results)
    status, body = session_d.request_json("GET", "/api/customers")
    assert_status("gated-until-password-change", status, {403}, results)
    gate_code = json.loads(body or "{}").get("code")
    assert_condition("gate-names-the-reason", gate_code == "password_change_required", f"gate code was {gate_code!r}.", results)
    change_password(session_d, password, other_password, "change-temporary-password", results)
    status, _ = session_d.request_json("GET", "/api/customers")
    assert_status("ungated-after-password-change", status, {200}, results)

    status, _ = admin.request_json("DELETE", f"{MECHANICS_PATH}/{person_id}")
    assert_status("admin-delete-mechanic", status, {200}, results)
    created.remove(person_id)
    assert_validate_status(session_d, "session-ended-by-admin-delete", 401, results)


def check_self_delete(
    base_url: str, origin: str, admin: HttpClient, password: str, results: list[StepResult], created: list[int],
) -> None:
    """Deletes a mechanic's own profile in one session and asserts its other session ends."""
    credentials, person_id = register_mechanic(admin, "selfdelete", password, results)
    created.append(person_id)
    deleting, _ = sign_in(base_url, origin, credentials, "login-deleting-session", results)
    bystander, _ = sign_in(base_url, origin, credentials, "login-other-session", results)

    status, _ = deleting.request_json("DELETE", "/api/profile", {"currentPassword": password})
    assert_status("self-delete-profile", status, {200}, results)
    created.remove(person_id)
    assert_validate_status(bystander, "other-session-ended-by-self-delete", 401, results)


def run_checks(base_url: str, origin: str, results: list[StepResult]) -> None:
    """Provisions disposable mechanics as the admin, runs both walks, and removes whatever is left behind."""
    password = read_required_env("ARSM_TEST_PASSWORD")
    other_password = read_required_env("ARSM_TEST_MECHANIC_NEW_PASSWORD")
    admin, _ = sign_in(base_url, origin, read_admin_credentials(), "login-admin", results)
    created: list[int] = []
    try:
        check_password_change_reset_and_delete(base_url, origin, admin, (password, other_password), results, created)
        check_self_delete(base_url, origin, admin, password, results, created)
    finally:
        # Best effort: only a failed run leaves a mechanic in `created`, and cleanup must not mask its failure.
        for person_id in created:
            admin.request_json("DELETE", f"{MECHANICS_PATH}/{person_id}")
        admin.request_json("POST", "/api/auth/logout")


if __name__ == "__main__":
    sys.exit(run_check(run_checks))
