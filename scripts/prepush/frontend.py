"""Frontend stage, a local mirror of the dotnet.yml frontend-build job."""

from __future__ import annotations

from .constants import CI_VITE_API_URL, CI_VITE_SITE_URL
from .environment import WEBUI, Context
from .gitref import path_differs, upstream_ref
from .steps import StageOutcome, StepSpec, run_specs

LOCKFILE = "app/AutoService.WebUI/package-lock.json"


def needs_install(ctx: Context) -> bool:
    """Install only when node_modules is missing or the lockfile differs from the last pushed upstream."""
    if not (WEBUI / "node_modules").is_dir():
        ctx.say("[INFO] node_modules is missing, npm ci will run.")
        return True
    ref = upstream_ref()
    if ref is None:
        ctx.say("[INFO] No upstream ref found, npm ci will run.")
        return True
    if path_differs(ref, LOCKFILE):
        ctx.say(f"[INFO] package-lock.json differs from {ref}, npm ci will run.")
        return True
    ctx.say(f"[INFO] package-lock.json matches {ref}, reusing node_modules.")
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
