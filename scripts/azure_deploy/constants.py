"""Key lists, defaults and fixed Azure resource names of the production deploy."""

from __future__ import annotations

from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]
ENV_FILE = ROOT_DIR / ".env"
UNIQUE_TYPES_DIR = ROOT_DIR / "app" / "AutoService.ApiService" / "Domain" / "UniqueTypes"

EXIT_OK, EXIT_STEP_FAILED, EXIT_BAD_CONFIG = 0, 1, 2

REQUIRED_KEYS = (
    "ARSM_AZURE_SUBSCRIPTION_ID",
    "ARSM_AZURE_RESOURCE_GROUP",
    "ARSM_ACR_NAME",
    "ARSM_PUBLIC_URL",
    "ARSM_POSTGRES_PASSWORD",
    "ARSM_JWT_SECRET",
    "ARSM_PROD_GATE_TOKEN",
    "ARSM_PROD_ADMIN_EMAIL",
    "ARSM_PROD_ADMIN_PASSWORD",
    "ARSM_PROD_ADMIN_FIRST_NAME",
    "ARSM_PROD_ADMIN_LAST_NAME",
    "ARSM_PROD_ADMIN_SPECIALIZATION",
    "ARSM_PROD_ADMIN_EXPERTISE",
    "ARSM_COMPANY_NAME",
    "ARSM_COMPANY_ADDRESS_LINE",
    "ARSM_COMPANY_POSTAL_CODE",
    "ARSM_COMPANY_CITY",
    "ARSM_COMPANY_TAX_NUMBER",
    "ARSM_COMPANY_PHONE",
    "ARSM_COMPANY_EMAIL",
    "ARSM_RESEND_API_KEY",
    "ARSM_MAIL_FROM",
    "ARSM_MAIL_REPLY_TO",
)
OPTIONAL_DEFAULTS = {
    "ARSM_AZURE_LOCATION": "swedencentral",
    "ARSM_API_ALWAYS_ON": "true",
    "ARSM_WEB_ALWAYS_ON": "false",
    "ARSM_BLOB_CONTAINER": "arsm-profile-pictures",
    "ARSM_MONTHLY_BUDGET": "0",
    "ARSM_LOG_DAILY_QUOTA_GB": "1",
}
OPTIONAL_UNSET = ("ARSM_PROD_ADMIN_MIDDLE_NAME", "ARSM_PROD_ADMIN_PHONE", "ARSM_ALERT_EMAIL")

# Keys whose values are secrets; their names are listed, their values are never printed.
SECRET_KEYS = (
    "ARSM_POSTGRES_PASSWORD",
    "ARSM_JWT_SECRET",
    "ARSM_PROD_GATE_TOKEN",
    "ARSM_PROD_ADMIN_PASSWORD",
    "ARSM_RESEND_API_KEY",
)

RESOURCE_NAMES = {"api": "arsm-api", "web": "arsm-web", "gate": "arsm-gate"}
ENVIRONMENT_NAME = "arsm-env"
REGISTRY_DEPLOYMENT = "arsm-registry"
MAIN_DEPLOYMENT = "arsm-main"
BICEP_DIR = "deploy/azure"
DOCKERFILES = {"api": "deploy/api.Dockerfile", "web": "deploy/web.Dockerfile", "gate": "deploy/gate/Dockerfile"}
TAG_LENGTH = 12
REQUIRED_TOOLS = ("az", "docker", "git")
