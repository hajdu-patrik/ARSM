"""Shared fixtures of the azure_deploy tests: a valid fake .env, config builder and a recording runner."""

from __future__ import annotations

import uuid
from pathlib import Path
from types import SimpleNamespace
from typing import Callable

import scriptsupport  # noqa: F401  (puts scripts/ on sys.path)
from azure_deploy.config import DeployConfig, load_config
from azure_deploy.enums import read_enum_names
from azure_deploy.errors import StepFailure
from azure_deploy.masking import SecretMasker
from azure_deploy.runner import CommandResult


def fake_password() -> str:
    """Passes the Postgres rules (length, four character classes) and is unique per call."""
    return "Aa1-" + uuid.uuid4().hex


def valid_env() -> dict[str, str]:
    """A complete, valid set of required keys built from run-time fake values."""
    return {
        "ARSM_AZURE_SUBSCRIPTION_ID": str(uuid.uuid4()),
        "ARSM_AZURE_RESOURCE_GROUP": "rg-arsm-test",
        "ARSM_ACR_NAME": "arsmtest" + uuid.uuid4().hex[:6],
        "ARSM_PUBLIC_URL": "https://arsm.example.test",
        "ARSM_POSTGRES_PASSWORD": fake_password(),
        "ARSM_POSTGRES_APP_PASSWORD": fake_password(),
        "ARSM_JWT_SECRET": uuid.uuid4().hex + uuid.uuid4().hex,
        "ARSM_PROD_GATE_TOKEN": uuid.uuid4().hex + "ab",
        "ARSM_PROD_ADMIN_EMAIL": "admin@example.test",
        "ARSM_PROD_ADMIN_PASSWORD": fake_password(),
        "ARSM_PROD_ADMIN_FIRST_NAME": "Test",
        "ARSM_PROD_ADMIN_LAST_NAME": "Admin",
        "ARSM_PROD_ADMIN_SPECIALIZATION": read_enum_names("SpecializationType")[0],
        "ARSM_PROD_ADMIN_EXPERTISE": read_enum_names("ExpertiseType")[0],
        "ARSM_COMPANY_NAME": "ARSM Test Kft.",
        "ARSM_COMPANY_ADDRESS_LINE": "Test utca 1",
        "ARSM_COMPANY_POSTAL_CODE": "1111",
        "ARSM_COMPANY_CITY": "Budapest",
        "ARSM_COMPANY_TAX_NUMBER": "00000000-0-00",
        "ARSM_COMPANY_PHONE": "+3610000000",
        "ARSM_COMPANY_EMAIL": "info@example.test",
        "ARSM_RESEND_API_KEY": "re_" + uuid.uuid4().hex[:20],
        "ARSM_MAIL_FROM": "ARSM <noreply@example.test>",
        "ARSM_MAIL_REPLY_TO": "reply@example.test",
    }


def env_text(values: dict[str, str]) -> str:
    return "".join(f"{key}={value}\n" for key, value in values.items())


def make_config(directory: Path, **overrides: str) -> DeployConfig:
    """Write a valid .env (with overrides) below `directory` and load it through load_config."""
    path = directory / ".env"
    path.write_text(env_text({**valid_env(), **overrides}), encoding="utf-8", newline="\n")
    return load_config(path)


class FakeRunner:
    """Records run() calls and say() lines; answers captured commands through `responses`."""

    def __init__(self, dry_run: bool = False, responses: Callable[[list[str]], str] | None = None,
                 fail_when: Callable[[list[str]], bool] | None = None) -> None:
        self.dry_run = dry_run
        self.masker = SecretMasker()
        self.calls: list[SimpleNamespace] = []
        self.lines: list[str] = []
        self.responses = responses or (lambda args: "")
        self.fail_when = fail_when

    def say(self, message: str = "") -> None:
        self.lines.append(message)

    def run(self, args, *, env_extra=None, cwd=None, capture=False, read_only=False):  # noqa: ANN001
        args = list(args)
        self.calls.append(SimpleNamespace(args=args, env_extra=env_extra, cwd=cwd, capture=capture, read_only=read_only))
        if self.fail_when is not None and self.fail_when(args):
            raise StepFailure("scripted failure")
        return CommandResult(self.responses(args))

    def commands(self) -> list[str]:
        return [" ".join(call.args) for call in self.calls]
