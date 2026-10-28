"""Per-key checks of the deploy settings; each returns a reason without the value, or None when fine."""

from __future__ import annotations

import re
from typing import Callable
from urllib.parse import urlparse

from .enums import read_enum_names

GUID = re.compile(r"^[0-9a-fA-F]{8}-(?:[0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$")
RESOURCE_GROUP = re.compile(r"^[\w.()-]{1,90}$")
ACR_NAME = re.compile(r"^[a-z0-9]{5,50}$")
LOCATION = re.compile(r"^[a-z0-9]{2,40}$")
CONTAINER = re.compile(r"^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){2,62}$")
EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
WHOLE_NUMBER = re.compile(r"^[0-9]{1,9}$")
MIN_JWT_BYTES, MIN_GATE_TOKEN_CHARS = 32, 32
MIN_RESEND_KEY_CHARS = 20
MAIL_FROM_NAMED = re.compile(r"^[^<>]+<([^<>]+)>$")
MAX_EXPERTISE = 10

Check = Callable[[str], "str | None"]


def parse_expertise(value: str) -> list[str]:
    """Split the comma separated expertise list, trimming blanks."""
    return [item.strip() for item in value.split(",") if item.strip()]


def parse_whole_number(value: str) -> int | None:
    """The value as a whole number of at most 9 digits, or None when it is anything else."""
    return int(value) if WHOLE_NUMBER.match(value) else None


def check_subscription(value: str) -> str | None:
    return None if GUID.match(value) else "must be a subscription GUID"


def check_resource_group(value: str) -> str | None:
    ok = RESOURCE_GROUP.match(value) and not value.endswith(".")
    return None if ok else "1-90 letters, digits, _ . ( ) - and not ending with a dot"


def check_acr_name(value: str) -> str | None:
    return None if ACR_NAME.match(value) else "5-50 lowercase letters and digits only"


def check_location(value: str) -> str | None:
    return None if LOCATION.match(value) else "must be an Azure region name such as swedencentral"


def check_public_url(value: str) -> str | None:
    try:
        parsed = urlparse(value)
        port = parsed.port
    except ValueError:
        return "is not a valid URL"
    if parsed.scheme != "https":
        return "must start with https://"
    if not parsed.hostname or "." not in parsed.hostname:
        return "must hold a public domain name"
    if value.endswith("/") or parsed.path or parsed.query or parsed.fragment or port or parsed.username:
        return "must be the bare origin: no trailing slash, path, port or credentials"
    return None


def check_postgres_password(value: str) -> str | None:
    if not 8 <= len(value) <= 128:
        return "Azure PostgreSQL needs 8-128 characters"
    classes = [any(c.islower() for c in value), any(c.isupper() for c in value),
               any(c.isdigit() for c in value), any(not c.isalnum() for c in value)]
    return None if sum(classes) >= 3 else "needs 3 of: lowercase, uppercase, digit, symbol"


def check_jwt_secret(value: str) -> str | None:
    return None if len(value.encode("utf-8")) >= MIN_JWT_BYTES else f"must be at least {MIN_JWT_BYTES} bytes"


def check_gate_token(value: str) -> str | None:
    return None if len(value) >= MIN_GATE_TOKEN_CHARS else f"must be at least {MIN_GATE_TOKEN_CHARS} characters"


def check_email(value: str) -> str | None:
    return None if EMAIL.match(value) else "must look like an email address"


def check_resend_api_key(value: str) -> str | None:
    ok = value.startswith("re_") and len(value) >= MIN_RESEND_KEY_CHARS
    return None if ok else f"must start with re_ and be at least {MIN_RESEND_KEY_CHARS} characters"


def check_mail_from(value: str) -> str | None:
    if "\r" in value or "\n" in value:
        return "must not contain line breaks"
    named = MAIL_FROM_NAMED.match(value.strip())
    address = named.group(1).strip() if named else value.strip()
    return None if EMAIL.match(address) else "must be an address or Display Name <address>"


def check_specialization(value: str) -> str | None:
    names = read_enum_names("SpecializationType")
    return None if value in names else "must be one of: " + ", ".join(names)


def check_expertise(value: str) -> str | None:
    items = parse_expertise(value)
    names = read_enum_names("ExpertiseType")
    if not 1 <= len(items) <= MAX_EXPERTISE:
        return f"needs 1-{MAX_EXPERTISE} comma separated names"
    if len(set(items)) != len(items):
        return "names must be unique"
    unknown = [item for item in items if item not in names]
    return ("unknown name(s): " + ", ".join(unknown) + "; valid: " + ", ".join(names)) if unknown else None


def check_always_on(value: str) -> str | None:
    return None if value.lower() in {"true", "false"} else "must be true or false"


def check_container(value: str) -> str | None:
    return None if CONTAINER.match(value) else "3-63 lowercase letters, digits and single hyphens"


def check_monthly_budget(value: str) -> str | None:
    return None if parse_whole_number(value) is not None else "must be a whole number, 0 for no budget"


def check_log_daily_quota(value: str) -> str | None:
    quota = parse_whole_number(value)
    return None if quota is not None and quota >= 1 else "must be a whole number from 1"


KEY_CHECKS: dict[str, Check] = {
    "ARSM_AZURE_SUBSCRIPTION_ID": check_subscription,
    "ARSM_AZURE_RESOURCE_GROUP": check_resource_group,
    "ARSM_ACR_NAME": check_acr_name,
    "ARSM_AZURE_LOCATION": check_location,
    "ARSM_PUBLIC_URL": check_public_url,
    "ARSM_POSTGRES_PASSWORD": check_postgres_password,
    "ARSM_POSTGRES_APP_PASSWORD": check_postgres_password,
    "ARSM_JWT_SECRET": check_jwt_secret,
    "ARSM_PROD_GATE_TOKEN": check_gate_token,
    "ARSM_PROD_ADMIN_EMAIL": check_email,
    "ARSM_PROD_ADMIN_SPECIALIZATION": check_specialization,
    "ARSM_PROD_ADMIN_EXPERTISE": check_expertise,
    "ARSM_COMPANY_EMAIL": check_email,
    "ARSM_MAIL_FROM": check_mail_from,
    "ARSM_MAIL_REPLY_TO": check_email,
    "ARSM_RESEND_API_KEY": check_resend_api_key,
    "ARSM_API_ALWAYS_ON": check_always_on,
    "ARSM_WEB_ALWAYS_ON": check_always_on,
    "ARSM_BLOB_CONTAINER": check_container,
    "ARSM_ALERT_EMAIL": check_email,
    "ARSM_MONTHLY_BUDGET": check_monthly_budget,
    "ARSM_LOG_DAILY_QUOTA_GB": check_log_daily_quota,
}
