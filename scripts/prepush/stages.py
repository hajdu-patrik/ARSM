"""Validate, backend and E2E stages; the frontend and API-suite stages have their own modules."""

from __future__ import annotations

import sys

from .environment import APP, ROOT, SCRIPTS, Context
from .gitref import upstream_ref
from .report import print_failed_suites
from .steps import StageOutcome, StepSpec, run_specs


def validate(ctx: Context) -> StageOutcome:
    command = [sys.executable, str(SCRIPTS / "validate.py"), "--all", "--security"]
    return run_specs(ctx, "validate", [StepSpec("validate.py --all --security", command, ROOT)])


def backend(ctx: Context) -> StageOutcome:
    """Mirror of the dotnet.yml backend job plus the scripts tests CI runs in repo-gate; the NuGet audit is in validate.py --security."""
    ef_command = ["dotnet", "tool", "run", "dotnet-ef", "--", "migrations", "has-pending-model-changes", "--project", "AutoService.ApiService"]
    scripts_tests = [sys.executable, "-m", "unittest", "discover", "-s", "tests/Scripts"]
    specs = [
        StepSpec("python -m unittest tests/Scripts", scripts_tests, ROOT),
        StepSpec("dotnet restore --locked-mode", ["dotnet", "restore", "--locked-mode"], APP),
        StepSpec("dotnet build --no-restore", ["dotnet", "build", "--no-restore"], APP),
        StepSpec("dotnet test --no-build", ["dotnet", "test", "--no-build"], APP),
        StepSpec("dotnet tool restore", ["dotnet", "tool", "restore"], APP, attempts=2),
        StepSpec("dotnet-ef has-pending-model-changes", ef_command, APP),
    ]
    return run_specs(ctx, "backend", specs)


def e2e(ctx: Context) -> StageOutcome:
    """Diff-selected Playwright specs; the diff is taken against the last pushed upstream, HEAD otherwise."""
    command = [sys.executable, str(SCRIPTS / "select-e2e-specs.py"), "--run"]
    ref = upstream_ref()
    if ref is not None:
        command += ["--base", ref]
    outcome = run_specs(ctx, "e2e", [StepSpec("select-e2e-specs.py --run", command, ROOT)])
    if outcome.status == "FAIL":
        print_failed_suites(ctx)
    return outcome
