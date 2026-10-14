"""Preflight of the api-suites stage: launch profile, free port, local settings and local secrets."""

from __future__ import annotations

import json
import re
import shutil
import socket
from dataclasses import dataclass
from urllib.parse import urlparse

from .constants import BLOCKING_LOCAL_SECTIONS, REQUIRED_LOCAL_SECRETS
from .environment import API_PROJECT_DIR, Context
from .steps import StepFailure

LAUNCH_SETTINGS = API_PROJECT_DIR / "Properties" / "launchSettings.json"
LOCAL_SETTINGS = API_PROJECT_DIR / "appsettings.Local.json"
BASE_SETTINGS = API_PROJECT_DIR / "appsettings.json"


@dataclass(frozen=True)
class LaunchEndpoint:
    """The https origin the API listens on, taken from the launch profile."""

    url: str
    port: int


def read_launch_endpoint() -> LaunchEndpoint:
    try:
        profile = json.loads(LAUNCH_SETTINGS.read_text(encoding="utf-8-sig"))["profiles"]["https"]
        urls = [item.strip() for item in profile["applicationUrl"].split(";") if item.strip().startswith("https://")]
        parsed = urlparse(urls[0])
        return LaunchEndpoint(f"{parsed.scheme}://{parsed.netloc}", parsed.port or 443)
    except (OSError, ValueError, KeyError, IndexError) as error:
        raise StepFailure(f"The https launch profile in {LAUNCH_SETTINGS.name} cannot be read ({type(error).__name__}).") from error


def port_in_use(port: int) -> bool:
    """True when something accepts connections on the port, on IPv4 or IPv6 loopback."""
    for host in ("127.0.0.1", "::1"):
        try:
            with socket.create_connection((host, port), timeout=1):
                return True
        except OSError:
            continue
    return False


def _has_section(text: str, name: str) -> bool:
    return re.search(r'"' + name + r'"\s*:', text, re.IGNORECASE) is not None


def check_local_settings(ctx: Context) -> None:
    """appsettings.Local.json loads after environment variables; a Bootstrap section would beat the env values."""
    if not LOCAL_SETTINGS.is_file():
        return
    text = LOCAL_SETTINGS.read_text(encoding="utf-8-sig", errors="replace")
    blocking = [name for name in BLOCKING_LOCAL_SECTIONS if _has_section(text, name)]
    if blocking:
        raise StepFailure(
            f"app/AutoService.ApiService/appsettings.Local.json has a {', '.join(blocking)} section that would override "
            "the throwaway environment values. Remove that section yourself; this script never edits the file.",
        )
    if _has_section(text, "ConnectionStrings"):
        ctx.say("[INFO] appsettings.Local.json has ConnectionStrings; ConnectionStringResolver prefers the environment variable, so it is ignored.")


def default_webui_origin() -> str:
    """First allowed CORS origin of appsettings.json, used when no local secret names the WebUI origin."""
    try:
        origins = json.loads(BASE_SETTINGS.read_text(encoding="utf-8-sig"))["Cors"]["AllowedOrigins"]
        return str(origins[0])
    except (OSError, ValueError, KeyError, IndexError):
        return ""


def preflight(ctx: Context) -> LaunchEndpoint:
    """Abort before anything starts when the machine cannot host the throwaway stack."""
    missing = [name for name in REQUIRED_LOCAL_SECRETS if not ctx.environment.get(name, "").strip()]
    if missing:
        raise StepFailure(f"Missing local secrets: {', '.join(missing)}. Set them in tests/.env or .secrets (see tests/.env.example).")
    check_local_settings(ctx)
    endpoint = read_launch_endpoint()
    if port_in_use(endpoint.port):
        raise StepFailure(
            f"Port {endpoint.port} (API https launch profile) is already in use, probably by the dev AppHost. "
            "Stop it and run the gate again; nothing was killed.",
        )
    docker = shutil.which("docker")
    if docker is None:
        raise StepFailure("Required command not found: docker")
    if ctx.runner.run("docker-info", [docker, "info"], API_PROJECT_DIR, ctx.environment).return_code != 0:
        raise StepFailure("The Docker daemon is not reachable. Start Docker Desktop and run the gate again.")
    return endpoint
