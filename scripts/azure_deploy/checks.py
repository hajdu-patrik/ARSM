"""The check subcommand: key and tool status, printing key names only."""

from __future__ import annotations

import shutil

from .config import collect_issues
from .constants import ENV_FILE, OPTIONAL_DEFAULTS, OPTIONAL_UNSET, REQUIRED_KEYS, REQUIRED_TOOLS
from .envfile import read_env_file
from .errors import ConfigError


def run_check() -> None:
    """Print ok/missing/invalid per key and tool; raises ConfigError when anything is wrong."""
    if not ENV_FILE.is_file():
        raise ConfigError("Root .env not found; copy the ARSM_ block of .env.example into it and fill it in.")
    raw = read_env_file(ENV_FILE)
    issues: dict[str, list[str]] = {}
    for issue in collect_issues(raw):
        issues.setdefault(issue.key, []).append(issue.reason)
    problems = 0
    print("Required keys:")
    for key in REQUIRED_KEYS:
        problems += _print_key(key, issues, "ok")
    print("Optional keys:")
    for key in (*OPTIONAL_DEFAULTS, *OPTIONAL_UNSET):
        fallback = "default" if key in OPTIONAL_DEFAULTS else "unset"
        problems += _print_key(key, issues, "ok" if raw.get(key) else fallback)
    print("Tools:")
    for tool in REQUIRED_TOOLS:
        found = shutil.which(tool) is not None
        print(f"  {tool}: {'ok' if found else 'missing'}")
        problems += 0 if found else 1
    if problems:
        raise ConfigError(f"{problems} problem(s) found; fix .env / install the tools and run check again.")
    print("All checks passed.")


def _print_key(key: str, issues: dict[str, list[str]], ok_label: str) -> int:
    reasons = issues.get(key)
    if not reasons:
        print(f"  {key}: {ok_label}")
        return 0
    status = "missing" if reasons == ["missing"] else "invalid (" + "; ".join(reasons) + ")"
    print(f"  {key}: {status}")
    return 1
