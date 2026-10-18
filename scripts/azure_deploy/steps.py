"""Azure steps: registry, infra, dns and bind-domain; secrets reach az only through the process environment."""

from __future__ import annotations

import json

from .archive import exported_commit
from .config import DeployConfig
from .constants import BICEP_DIR, ENVIRONMENT_NAME, MAIN_DEPLOYMENT, REGISTRY_DEPLOYMENT, RESOURCE_NAMES
from .errors import StepFailure
from .images import acr_login, verify_images_exist
from .runner import CommandRunner

CLOUDFLARE_NOTE = "Proxy status must be 'DNS only' (grey cloud); the Azure managed certificate cannot validate behind the proxy."


def use_subscription(runner: CommandRunner, config: DeployConfig) -> None:
    """Select the configured subscription for the following az calls."""
    runner.run(["az", "account", "set", "--subscription", config.subscription_id])


def registry(runner: CommandRunner, config: DeployConfig, commit_sha: str) -> None:
    """Ensure the resource group, deploy registry.bicep and log docker in to the ACR."""
    use_subscription(runner, config)
    runner.run(["az", "group", "create", "--name", config.resource_group, "--location", config.location, "--output", "none"])
    with exported_commit(runner, commit_sha) as source:
        runner.run(
            [
                "az", "deployment", "group", "create", "--resource-group", config.resource_group,
                "--name", REGISTRY_DEPLOYMENT, "--template-file", f"{source.as_posix()}/{BICEP_DIR}/registry.bicep",
                "--parameters", f"acrName={config.acr_name}", "--output", "none",
            ],
        )
    acr_login(runner, config)


def infra(runner: CommandRunner, config: DeployConfig, commit_sha: str, tag: str) -> dict[str, str]:
    """Deploy main.bicep + main.bicepparam; the bicepparam reads its values from the child environment."""
    use_subscription(runner, config)
    verify_images_exist(runner, config, tag)
    environment = {**config.az_environment(tag), "ARSM_CUSTOM_DOMAIN_CERT": managed_certificate_name(runner, config)}
    with exported_commit(runner, commit_sha) as source:
        result = runner.run(
            [
                "az", "deployment", "group", "create", "--resource-group", config.resource_group,
                "--name", MAIN_DEPLOYMENT, "--parameters", f"{source.as_posix()}/{BICEP_DIR}/main.bicepparam",
                "--query", "properties.outputs", "--output", "json",
            ],
            env_extra=environment,
            capture=True,
        )
    outputs = parse_outputs(result.stdout) if not runner.dry_run else {}
    print_outputs(runner, outputs)
    return outputs


def managed_certificate_name(runner: CommandRunner, config: DeployConfig) -> str:
    """Managed certificate already issued for the public hostname, so infra keeps the binding; '' before bind-domain."""
    query = f"[?properties.subjectName=='{config.hostname}'].name | [0]"
    try:
        result = runner.run(
            [
                "az", "containerapp", "env", "certificate", "list", "--resource-group", config.resource_group,
                "--name", ENVIRONMENT_NAME, "--managed-certificates-only", "--query", query, "--output", "tsv",
            ],
            capture=True,
            read_only=True,
        )
    except StepFailure:
        return ""
    return result.stdout.strip()


def parse_outputs(text: str) -> dict[str, str]:
    """Flatten the az deployment outputs JSON ({name: {type, value}}) into name -> value."""
    try:
        raw = json.loads(text) or {}
        return {name: str(entry["value"]) for name, entry in raw.items()}
    except (ValueError, KeyError, TypeError, AttributeError) as error:
        raise StepFailure("The deployment outputs could not be read.") from error


def print_outputs(runner: CommandRunner, outputs: dict[str, str]) -> None:
    """Print the non-secret deployment outputs."""
    for name in ("publicUrl", "webDefaultHost", "environmentStaticIp", "customDomainVerificationId", "postgresHost"):
        runner.say(f"  {name}: {outputs.get(name, '<known after the real deployment>')}")


def read_outputs(runner: CommandRunner, config: DeployConfig) -> dict[str, str]:
    """Fetch the outputs of the last main deployment (empty in dry-run)."""
    use_subscription(runner, config)
    result = runner.run(
        [
            "az", "deployment", "group", "show", "--resource-group", config.resource_group,
            "--name", MAIN_DEPLOYMENT, "--query", "properties.outputs", "--output", "json",
        ],
        capture=True,
    )
    return {} if runner.dry_run else parse_outputs(result.stdout)


def record_names(hostname: str) -> tuple[str, str]:
    """Cloudflare record names for the A and the TXT record (zone = last two labels)."""
    labels = hostname.split(".")
    if len(labels) <= 2:
        return "@", "asuid"
    sub = ".".join(labels[:-2])
    return sub, f"asuid.{sub}"


def dns(runner: CommandRunner, config: DeployConfig, outputs: dict[str, str] | None = None) -> None:
    """Print the exact Cloudflare records for the custom domain."""
    outputs = read_outputs(runner, config) if outputs is None else outputs
    ip = outputs.get("environmentStaticIp", "<environmentStaticIp>")
    verification_id = outputs.get("customDomainVerificationId", "<customDomainVerificationId>")
    a_name, txt_name = record_names(config.hostname)
    runner.say(f"\nCloudflare DNS records for {config.hostname} (zone {'.'.join(config.hostname.split('.')[-2:])}):")
    runner.say(f"  A    name={a_name}  content={ip}  proxy=DNS only")
    runner.say(f"  TXT  name={txt_name}  content={verification_id}  proxy=DNS only")
    runner.say(f"Note: {CLOUDFLARE_NOTE}")
    runner.say("Wait for DNS to propagate, then run: python scripts/deploy-azure.py bind-domain")


def bind_domain(runner: CommandRunner, config: DeployConfig) -> None:
    """Add the hostname to arsm-web and bind a free managed certificate (HTTP validation)."""
    use_subscription(runner, config)
    base = ["--name", RESOURCE_NAMES["web"], "--resource-group", config.resource_group, "--hostname", config.hostname]
    runner.run(["az", "containerapp", "hostname", "add", *base])
    runner.run(
        ["az", "containerapp", "hostname", "bind", *base, "--environment", ENVIRONMENT_NAME, "--validation-method", "HTTP"],
    )
    runner.say(f"Bound {config.hostname}; the site answers on {config.public_url} once the certificate is issued.")
