#!/usr/bin/env python3
"""Two sessions race the catalog writes: a taken part number or labor type code on create and on update, and a double
delete, answer the sequential 409 or 404, never a 500. Races are timing-bound, so each pair is fired several times."""

from __future__ import annotations

import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from http_check_runner import run_check, sign_in  # noqa: E402
from http_check_support import HttpClient, StepResult, assert_status, read_admin_credentials  # noqa: E402
from race_check_support import (  # noqa: E402
    ROUNDS,
    Disposables,
    assert_detail,
    assert_outcomes,
    race_requests,
    unique_tag,
    winner_body,
)


@dataclass(frozen=True)
class CatalogKind:
    """What differs between the two catalog tables: route, key and price field names, and the sequential details."""

    name: str
    route: str
    key_field: str
    price_field: str
    duplicate_detail: str
    not_found_detail: str

    def body(self, key: str, version: int | None = None) -> dict[str, Any]:
        payload = {self.key_field: key, "name": "Race item", self.price_field: 100, "vatRatePercent": 27}
        return payload if version is None else {**payload, "version": version}

    def unique_key(self) -> str:
        return f"RACE-{unique_tag().upper()}"


KINDS = (
    CatalogKind("part", "/api/parts", "partNumber", "netUnitPrice", "A part with this part number already exists.", "Part not found."),
    CatalogKind(
        "labor-type", "/api/labor-types", "code", "hourlyNetRate",
        "A labor type with this code already exists.", "Labor type not found.",
    ),
)


def create_item(admin: HttpClient, disposables: Disposables, kind: CatalogKind, step: str, results: list[StepResult]) -> dict[str, Any]:
    status, body = admin.request_json("POST", kind.route, kind.body(kind.unique_key()))
    assert_status(step, status, {201}, results)
    item = json.loads(body)
    disposables.other(f"{kind.route}/{item['id']}")
    return item


def check_create(clients: list[HttpClient], disposables: Disposables, kind: CatalogKind, results: list[StepResult]) -> None:
    for round_index in range(ROUNDS):
        payload = kind.body(kind.unique_key())
        answers = race_requests(clients, "POST", [kind.route] * 2, [payload, payload])
        assert_outcomes(f"{kind.name}-create-race-{round_index}", answers, [201, 409], results)
        assert_detail(f"{kind.name}-create-race-detail-{round_index}", answers, 409, kind.duplicate_detail, results)
        disposables.other(f"{kind.route}/{winner_body(answers, 201)['id']}")


def check_update(clients: list[HttpClient], disposables: Disposables, kind: CatalogKind, results: list[StepResult]) -> None:
    for round_index in range(ROUNDS):
        first = create_item(clients[0], disposables, kind, f"{kind.name}-update-setup-a-{round_index}", results)
        second = create_item(clients[0], disposables, kind, f"{kind.name}-update-setup-b-{round_index}", results)
        key = kind.unique_key()
        answers = race_requests(
            clients,
            "PUT",
            [f"{kind.route}/{first['id']}", f"{kind.route}/{second['id']}"],
            [kind.body(key, first["version"]), kind.body(key, second["version"])],
        )
        assert_outcomes(f"{kind.name}-update-race-{round_index}", answers, [204, 409], results)
        assert_detail(f"{kind.name}-update-race-detail-{round_index}", answers, 409, kind.duplicate_detail, results)


def check_double_delete(clients: list[HttpClient], disposables: Disposables, kind: CatalogKind, results: list[StepResult]) -> None:
    for round_index in range(ROUNDS):
        item = create_item(clients[0], disposables, kind, f"{kind.name}-delete-setup-{round_index}", results)
        path = f"{kind.route}/{item['id']}"
        answers = race_requests(clients, "DELETE", [path] * 2, [None, None])
        assert_outcomes(f"{kind.name}-double-delete-race-{round_index}", answers, [204, 404], results)
        assert_detail(f"{kind.name}-double-delete-detail-{round_index}", answers, 404, kind.not_found_detail, results)


def run_checks(base_url: str, origin: str, results: list[StepResult]) -> None:
    first, _ = sign_in(base_url, origin, read_admin_credentials(), "login-first-session", results)
    second, _ = sign_in(base_url, origin, read_admin_credentials(), "login-second-session", results)
    clients = [first, second]
    disposables = Disposables(first)
    try:
        for kind in KINDS:
            check_create(clients, disposables, kind, results)
            check_update(clients, disposables, kind, results)
            check_double_delete(clients, disposables, kind, results)
    finally:
        second.request_json("POST", "/api/auth/logout")
        disposables.close()


if __name__ == "__main__":
    sys.exit(run_check(run_checks))
