"""The migration job between the two infra phases: start one execution and wait until it succeeded."""

from __future__ import annotations

import time
from typing import Callable

from .config import DeployConfig
from .constants import MIGRATION_JOB_NAME, MIGRATION_POLL_SECONDS, MIGRATION_TIMEOUT_SECONDS
from .errors import StepFailure
from .runner import CommandRunner

SUCCEEDED = "Succeeded"
FAILED_STATES = frozenset({"Failed", "Stopped", "Degraded"})
DRY_RUN_EXECUTION = "<execution name>"
LOG_HINT = "Job logs: deploy/docs/deployment-azure.md, section 8."


def run_migration_job(
    runner: CommandRunner,
    config: DeployConfig,
    *,
    timeout_seconds: float = MIGRATION_TIMEOUT_SECONDS,
    poll_seconds: float = MIGRATION_POLL_SECONDS,
    clock: Callable[[], float] = time.monotonic,
    sleep: Callable[[float], None] = time.sleep,
) -> None:
    """Start the job and block until its execution succeeded; any other end raises StepFailure. Dry-run never polls."""
    execution = start_execution(runner, config)
    if runner.dry_run:
        execution_status(runner, config, DRY_RUN_EXECUTION)
        return
    deadline = clock() + timeout_seconds
    while True:
        status = execution_status(runner, config, execution)
        runner.say(f"  {MIGRATION_JOB_NAME} execution {execution}: {status or 'pending'}")
        if status == SUCCEEDED:
            return
        if status in FAILED_STATES:
            raise StepFailure(f"Migration job execution {execution} ended as {status}; the apps were not updated. {LOG_HINT}")
        if clock() >= deadline:
            raise StepFailure(
                f"Migration job execution {execution} did not succeed within {int(timeout_seconds)} s; the apps were not updated. {LOG_HINT}"
            )
        sleep(poll_seconds)



def start_execution(runner: CommandRunner, config: DeployConfig) -> str:
    """Start one execution of the migration job and return its name ('' in dry-run)."""
    result = runner.run(
        [
            "az", "containerapp", "job", "start", "--resource-group", config.resource_group,
            "--name", MIGRATION_JOB_NAME, "--query", "name", "--output", "tsv",
        ],
        capture=True,
    )
    execution = result.stdout.strip()
    if not execution and not runner.dry_run:
        raise StepFailure("The migration job started without reporting an execution name; the apps were not updated.")
    return execution


def execution_status(runner: CommandRunner, config: DeployConfig, execution: str) -> str:
    """Current status of one job execution, for example Running or Succeeded ('' while az reports none)."""
    result = runner.run(
        [
            "az", "containerapp", "job", "execution", "show", "--resource-group", config.resource_group,
            "--name", MIGRATION_JOB_NAME, "--job-execution-name", execution,
            "--query", "properties.status", "--output", "tsv",
        ],
        capture=True,
    )
    return result.stdout.strip()
