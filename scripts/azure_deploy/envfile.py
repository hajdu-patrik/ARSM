"""Reads the root .env with the same KEY=VALUE rules as scripts/test_suite_secrets.py."""

from __future__ import annotations

from pathlib import Path


def clean_value(value: str) -> str:
    """Strip one pair of matching single or double quotes."""
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
        return value[1:-1]
    return value


def read_env_file(env_file: Path) -> dict[str, str]:
    """Parse KEY=VALUE lines, skipping blanks and # comments; a missing file yields an empty dict."""
    values: dict[str, str] = {}
    if not env_file.is_file():
        return values
    for raw_line in env_file.read_text(encoding="utf-8-sig").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip().removeprefix("export ").strip()
        if key:
            values[key] = clean_value(value.strip())
    return values
