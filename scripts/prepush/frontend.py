"""Frontend stage, a local mirror of the dotnet.yml frontend-build job."""

from __future__ import annotations

import json
from pathlib import Path

from .constants import CI_VITE_API_URL, CI_VITE_SITE_URL
from .environment import WEBUI, Context
from .steps import StageOutcome, StepSpec, run_specs


def _package_entries(lockfile: Path) -> dict[str, dict] | None:
    """The lockfile's package entries without the root, or None when it is missing or unreadable."""
    try:
        packages = json.loads(lockfile.read_text(encoding="utf-8")).get("packages")
    except (OSError, ValueError):
        return None
    if not isinstance(packages, dict):
        return None
    return {key: value for key, value in packages.items() if key and isinstance(value, dict)}


def _installed_matches_lock(lock: dict[str, dict], installed: dict[str, dict]) -> bool:
    """Every installed entry equals the lock's; lock-only entries must be optional (platform-skipped)."""
    fields = ("version", "resolved", "integrity", "link")
    for key, entry in installed.items():
        wanted = lock.get(key)
        if wanted is None or any(wanted.get(field) != entry.get(field) for field in fields):
            return False
    return all(lock[key].get("optional") or "os" in lock[key] or "cpu" in lock[key] for key in lock.keys() - installed.keys())


def needs_install(ctx: Context) -> bool:
    """Install when node_modules is missing or its hidden lockfile disagrees with package-lock.json."""
    if not (WEBUI / "node_modules").is_dir():
        ctx.say("[INFO] node_modules is missing, npm ci will run.")
        return True
    lock = _package_entries(WEBUI / "package-lock.json")
    installed = _package_entries(WEBUI / "node_modules" / ".package-lock.json")
    if lock is None or installed is None:
        ctx.say("[INFO] A lockfile is missing or unreadable, npm ci will run.")
        return True
    if not _installed_matches_lock(lock, installed):
        ctx.say("[INFO] node_modules differs from package-lock.json, npm ci will run.")
        return True
    ctx.say("[INFO] node_modules matches package-lock.json, reusing it.")
    return False


def run(ctx: Context) -> StageOutcome:
    build_env = {**ctx.environment, "VITE_API_URL": CI_VITE_API_URL, "VITE_SITE_URL": CI_VITE_SITE_URL}
    specs = [StepSpec("npm ci", ["npm", "ci"], WEBUI)] if needs_install(ctx) else []
    specs += [
        StepSpec("npm audit signatures", ["npm", "audit", "signatures"], WEBUI),
        StepSpec("tsc -b", ["npx", "tsc", "-b"], WEBUI),
        StepSpec("npm run lint", ["npm", "run", "lint"], WEBUI),
        StepSpec("npm run build", ["npm", "run", "build"], WEBUI, build_env),
        StepSpec("playwright test --list", ["npx", "playwright", "test", "--list"], WEBUI),
        StepSpec("npm audit --audit-level=high", ["npm", "audit", "--audit-level=high"], WEBUI),
    ]
    return run_specs(ctx, "frontend", specs)
