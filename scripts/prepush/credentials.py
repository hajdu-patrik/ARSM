"""Freshly generated infra credentials and the API environment of the disposable stack."""

from __future__ import annotations

import secrets
from dataclasses import dataclass

from .constants import DATABASE_NAME, INFRA_HOST, POSTGRES_HOST_PORT, S3_HOST_PORT
from .envtools import drop_env, drop_prefixed, set_env

# Variables that would override or leak into the throwaway API configuration.
SCRUBBED_PREFIXES = ("BOOTSTRAP__", "CONNECTIONSTRINGS__", "JWTSETTINGS__", "OBJECTSTORAGE__", "COMPANYPROFILE__")
SCRUBBED_NAMES = ("ASPNETCORE_ENVIRONMENT", "ASPNETCORE_URLS", "DOTNET_ENVIRONMENT")


def _password() -> str:
    """Upper, lower, digit and symbol so the value passes the Identity password policy."""
    return f"Pp{secrets.token_hex(12)}Aa1!"


@dataclass(frozen=True)
class InfraCredentials:
    """Per-run secrets of the throwaway containers and the API; never printed."""

    postgres_password: str
    s3_access_key: str
    s3_secret_key: str
    jwt_secret: str
    sql_reader_password: str

    @classmethod
    def generate(cls) -> "InfraCredentials":
        # The API rejects a JWT secret shorter than 32 bytes; 64 hex characters clear it.
        return cls(_password(), f"pp{secrets.token_hex(6)}", _password(), secrets.token_hex(32), _password())

    def values(self) -> list[str]:
        return [self.postgres_password, self.s3_access_key, self.s3_secret_key, self.jwt_secret, self.sql_reader_password]


def build_api_environment(base: dict[str, str], credentials: InfraCredentials, admin_email: str, admin_password: str) -> dict[str, str]:
    """Mirror the tests.yml API step; only the bootstrap admin comes from the local secrets."""
    env = dict(base)
    drop_prefixed(env, SCRUBBED_PREFIXES)
    for name in SCRUBBED_NAMES:
        drop_env(env, name)
    connection = (
        f"Host={INFRA_HOST};Port={POSTGRES_HOST_PORT};Database={DATABASE_NAME};"
        f"Username=postgres;Password={credentials.postgres_password}"
    )
    values = {
        "ConnectionStrings__AutoServiceDb": connection,
        "JwtSettings__Secret": credentials.jwt_secret,
        "Bootstrap__Admin__Email": admin_email,
        "Bootstrap__Admin__Password": admin_password,
        "Bootstrap__Admin__FirstName": "CI",
        "Bootstrap__Admin__LastName": "Admin",
        "Bootstrap__Admin__Specialization": "All",
        "Bootstrap__Admin__Expertise__0": "Engine",
        "ObjectStorage__ServiceUrl": f"http://{INFRA_HOST}:{S3_HOST_PORT}",
        "ObjectStorage__AccessKeyId": credentials.s3_access_key,
        "ObjectStorage__SecretAccessKey": credentials.s3_secret_key,
        "ObjectStorage__AutoCreateBucket": "true",
        "CompanyProfile__Name": "ARSM CI",
        "CompanyProfile__AddressLine": "Muegyetem rakpart 3",
        "CompanyProfile__PostalCode": "1111",
        "CompanyProfile__City": "Budapest",
        "CompanyProfile__TaxNumber": "00000000-0-00",
        "CompanyProfile__PhoneNumber": "+3610000000",
        "CompanyProfile__Email": "ci@example.test",
        "PGGSSENCMODE": "disable",
    }
    for key, value in values.items():
        set_env(env, key, value)
    return env
