"""Case-insensitive environment dictionary helpers (Windows folds variable names)."""

from __future__ import annotations


def drop_env(env: dict[str, str], key: str) -> None:
    """Remove every spelling of `key` from `env`."""
    for existing in [name for name in env if name.upper() == key.upper()]:
        del env[existing]


def set_env(env: dict[str, str], key: str, value: str) -> None:
    """Set `key` after removing differently cased duplicates."""
    drop_env(env, key)
    env[key] = value


def drop_prefixed(env: dict[str, str], prefixes: tuple[str, ...]) -> None:
    """Remove every variable whose upper-cased name starts with one of `prefixes`."""
    for existing in [name for name in env if name.upper().startswith(prefixes)]:
        del env[existing]
