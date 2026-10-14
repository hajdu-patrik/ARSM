"""Fixed names, ports, images and timeouts of the pre-push gate; the images mirror tests.yml."""

STAGE_NAMES = ("validate", "backend", "frontend", "e2e", "api-suites")

POSTGRES_CONTAINER = "arsm-prepush-postgres"
S3_CONTAINER = "arsm-prepush-s3"
POSTGRES_IMAGE = "postgres:18.6"
S3_IMAGE = "rustfs/rustfs:1.0.1"
POSTGRES_HOST_PORT = 55432
S3_HOST_PORT = 59000
INFRA_HOST = "127.0.0.1"
DATABASE_NAME = "AutoServiceDb"
READER_ROLE = "ai_agent_test_user"

POLL_SECONDS = 2
INFRA_READY_ATTEMPTS = 60
API_READY_SECONDS = 300

# The same .invalid origins as dotnet.yml: the production build only needs valid https origins.
CI_VITE_API_URL = "https://api.ci.invalid"
CI_VITE_SITE_URL = "https://app.ci.invalid"

# Slow stages need more than the 300 s child default; a developer-set value always wins.
DEFAULT_COMMAND_TIMEOUT_SECONDS = "1800"
DEFAULT_VALIDATE_TIMEOUT_SECONDS = "900"

# appsettings.Local.json sections that override the environment values handed to the API.
BLOCKING_LOCAL_SECTIONS = ("Bootstrap",)
REQUIRED_LOCAL_SECRETS = ("ARSM_TEST_ADMIN_EMAIL", "ARSM_TEST_ADMIN_PASSWORD")
