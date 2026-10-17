"""Masks secret values and credential-shaped text in every line the deploy script prints."""

from __future__ import annotations

from typing import Iterable

from test_suite_secrets import (
    ASSIGNMENT_SECRET_PATTERN,
    JSON_SECRET_FIELD_PATTERN,
    POSTGRES_URI_PATTERN,
    SENSITIVE_NAME_PATTERN,
)

REDACTED = "<redacted>"
MIN_SECRET_LENGTH = 4


class SecretMasker:
    """Replaces loaded secret values, Postgres URIs and secret-shaped assignments."""

    def __init__(self, secret_values: Iterable[str] = ()) -> None:
        self._values = sorted({v for v in secret_values if len(v) >= MIN_SECRET_LENGTH}, key=len, reverse=True)

    def add(self, values: Iterable[str]) -> None:
        """Register more secret values, keeping the longest-first replacement order."""
        merged = set(self._values) | {v for v in values if len(v) >= MIN_SECRET_LENGTH}
        self._values = sorted(merged, key=len, reverse=True)

    def mask(self, text: str) -> str:
        """Return text safe to print."""
        for value in self._values:
            text = text.replace(value, REDACTED)
        text = POSTGRES_URI_PATTERN.sub("postgresql://" + REDACTED, text)
        text = ASSIGNMENT_SECRET_PATTERN.sub(r"\1\2" + REDACTED, text)
        return JSON_SECRET_FIELD_PATTERN.sub(r'\1"' + REDACTED + '"', text)


def secret_values_of(environment: dict[str, str]) -> list[str]:
    """Values of every sensitively named key of an env mapping, for masking."""
    return [value for key, value in environment.items() if SENSITIVE_NAME_PATTERN.search(key)]
