"""The check subcommand: key and tool status, printing key names only, plus a warning for unregistered guard-rail providers."""

from __future__ import annotations

import shutil
import subprocess

from .config import collect_issues
from .constants import ENV_FILE, OPTIONAL_DEFAULTS, OPTIONAL_UNSET, REQUIRED_KEYS, REQUIRED_TOOLS
from .envfile import read_env_file
from .errors import ConfigError
from .validators import check_subscription, parse_whole_number

PROVIDER_QUERY_TIMEOUT_SECONDS = 60


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
    _print_provider_warnings(raw)
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


def guard_rail_providers(raw: dict[str, str]) -> list[str]:
    """Resource providers the optional guard rails of the .env need: Insights for the alerts, Consumption for the budget."""
    if not raw.get("ARSM_ALERT_EMAIL"):
        return []
    budget = parse_whole_number(raw.get("ARSM_MONTHLY_BUDGET") or OPTIONAL_DEFAULTS["ARSM_MONTHLY_BUDGET"]) or 0
    return ["Microsoft.Insights", *(["Microsoft.Consumption"] if budget > 0 else [])]


def registration_state(provider: str, subscription_id: str) -> str | None:
    """Registration state of a provider in the subscription (one read-only az query), None when az cannot tell."""
    az = shutil.which("az")
    if az is None:
        return None
    command = [az, "provider", "show", "--namespace", provider, "--subscription", subscription_id,
               "--query", "registrationState", "--output", "tsv"]
    try:
        completed = subprocess.run(
            command, capture_output=True, text=True, encoding="utf-8", errors="replace",
            timeout=PROVIDER_QUERY_TIMEOUT_SECONDS, check=False,
        )
    except (OSError, subprocess.TimeoutExpired):
        return None
    state = completed.stdout.strip()
    return state if completed.returncode == 0 and state.isalpha() else None


def _print_provider_warnings(raw: dict[str, str]) -> None:
    """Warn, never fail, when a provider of the guard rails is not registered; silent while no guard rail is on."""
    providers = guard_rail_providers(raw)
    subscription_id = raw.get("ARSM_AZURE_SUBSCRIPTION_ID", "")
    if not providers or check_subscription(subscription_id) is not None:
        return
    print("Resource providers of the guard rails (a warning only):")
    for provider in providers:
        state = registration_state(provider, subscription_id)
        if state is None:
            print(f"  {provider}: not checked (needs az login and the subscription)")
        elif state == "Registered":
            print(f"  {provider}: Registered")
        else:
            print(f"  {provider}: {state}, register it first: az provider register --namespace {provider}")
