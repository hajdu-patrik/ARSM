"""Loads the root .env into a validated DeployConfig; problems name keys and reasons, never values."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from urllib.parse import urlparse

from .constants import (
    ENV_FILE,
    OPTIONAL_DEFAULTS,
    OPTIONAL_UNSET,
    REQUIRED_KEYS,
    SECRET_KEYS,
)
from .envfile import read_env_file
from .errors import ConfigError
from .masking import SecretMasker, secret_values_of
from .validators import KEY_CHECKS, parse_whole_number

TEMPLATE_MARKERS = ("CHANGE_ME", "CHANGEME", "SET_UNIQUE_LOCAL")
# Keys that must never share a value: the prod gate token versus the teszt one, the API's database login versus
# the administrator; the prod admin may reuse the dev admin login (user decision, 2026-10-18).
DISTINCT_FROM = {
    "ARSM_PROD_GATE_TOKEN": ("GATE_TOKEN",),
    "ARSM_POSTGRES_APP_PASSWORD": ("ARSM_POSTGRES_PASSWORD",),
}
DISTINCT_REASONS = {
    "GATE_TOKEN": "no reuse of teszt or dev values",
    "ARSM_POSTGRES_PASSWORD": "the API's database login must not reuse the administrator password",
}


@dataclass(frozen=True)
class KeyIssue:
    """One key that is missing or invalid, with a value-free reason."""

    key: str
    reason: str


@dataclass(frozen=True)
class DeployConfig:
    """Validated deploy settings; `values` holds every ARSM_ key with optional defaults applied."""

    values: dict[str, str]
    masker: SecretMasker = field(compare=False, repr=False)

    @property
    def subscription_id(self) -> str:
        return self.values["ARSM_AZURE_SUBSCRIPTION_ID"]

    @property
    def resource_group(self) -> str:
        return self.values["ARSM_AZURE_RESOURCE_GROUP"]

    @property
    def location(self) -> str:
        return self.values["ARSM_AZURE_LOCATION"]

    @property
    def acr_name(self) -> str:
        return self.values["ARSM_ACR_NAME"]

    @property
    def registry_host(self) -> str:
        return f"{self.acr_name}.azurecr.io"

    @property
    def public_url(self) -> str:
        return self.values["ARSM_PUBLIC_URL"]

    @property
    def hostname(self) -> str:
        return urlparse(self.public_url).hostname or ""

    def image_names(self, tag: str) -> dict[str, str]:
        """Full image references of api, web and gate for a commit tag."""
        return {kind: f"{self.registry_host}/arsm-{kind}:{tag}" for kind in ("api", "web", "gate")}

    def az_environment(self, tag: str) -> dict[str, str]:
        """Variables for the az subprocess only: every .env deploy key plus the computed image refs."""
        env = dict(self.values)
        env["ARSM_ACR_NAME"] = self.acr_name
        for kind, reference in self.image_names(tag).items():
            env[f"ARSM_{kind.upper()}_IMAGE"] = reference
        for key in ("ARSM_API_ALWAYS_ON", "ARSM_WEB_ALWAYS_ON"):
            env[key] = self.values[key].lower()
        return env


def collect_issues(raw: dict[str, str]) -> list[KeyIssue]:
    """Every missing or invalid key, plus the DISTINCT_FROM rules (teszt keys, the database administrator)."""
    issues: list[KeyIssue] = []
    effective = {**OPTIONAL_DEFAULTS, **{k: v for k, v in raw.items() if v}}
    for key in REQUIRED_KEYS:
        if not raw.get(key):
            issues.append(KeyIssue(key, "missing"))
    for key in (*REQUIRED_KEYS, *OPTIONAL_DEFAULTS, *OPTIONAL_UNSET):
        value = effective.get(key, "")
        if not value:
            continue
        upper = value.upper()
        if any(marker in upper for marker in TEMPLATE_MARKERS):
            issues.append(KeyIssue(key, "still holds a template placeholder"))
            continue
        check = KEY_CHECKS.get(key)
        reason = check(value) if check else None
        if reason:
            issues.append(KeyIssue(key, reason))
    issues.extend(_budget_issues(effective))
    issues.extend(_distinctness_issues(raw))
    return issues


def _budget_issues(effective: dict[str, str]) -> list[KeyIssue]:
    """A budget above 0 is mailed to the alert address, so it cannot exist without one."""
    amount = parse_whole_number(effective.get("ARSM_MONTHLY_BUDGET", "")) or 0
    if amount > 0 and not effective.get("ARSM_ALERT_EMAIL"):
        return [KeyIssue("ARSM_MONTHLY_BUDGET", "needs ARSM_ALERT_EMAIL, the address its mails go to")]
    return []


def _distinctness_issues(raw: dict[str, str]) -> list[KeyIssue]:
    issues = []
    for prod_key, other_keys in DISTINCT_FROM.items():
        prod_value = raw.get(prod_key, "").strip().lower()
        for other in other_keys:
            if prod_value and prod_value == raw.get(other, "").strip().lower():
                issues.append(KeyIssue(prod_key, f"must differ from {other} ({DISTINCT_REASONS[other]})"))
    return issues


def load_config(env_file: Path = ENV_FILE) -> DeployConfig:
    """Parse and validate the root .env; raises ConfigError listing every problem by key name."""
    if not env_file.is_file():
        raise ConfigError("Root .env not found; copy the ARSM_ block of .env.example into it and fill it in.")
    raw = read_env_file(env_file)
    issues = collect_issues(raw)
    if issues:
        lines = [f"  {issue.key}: {issue.reason}" for issue in issues]
        raise ConfigError("Invalid deploy settings in .env:\n" + "\n".join(lines))
    values = {key: raw[key] for key in REQUIRED_KEYS}
    for key, default in OPTIONAL_DEFAULTS.items():
        values[key] = raw.get(key) or default
    for key in OPTIONAL_UNSET:
        if raw.get(key):
            values[key] = raw[key]
    masker = SecretMasker(secret_values_of(raw))
    masker.add(values[key] for key in SECRET_KEYS)
    return DeployConfig(values=values, masker=masker)
