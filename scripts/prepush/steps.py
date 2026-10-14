"""Step execution: commands run through the sanitizing runner, outcomes carry PASS/FAIL and timing."""

from __future__ import annotations

import shutil
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, Sequence

from .environment import Context

FAILURE_TAIL_LINES = 60


class StepFailure(RuntimeError):
    """A step failed for a known reason; `detail_lines` are extra sanitized lines to show."""

    def __init__(self, message: str, detail_lines: Sequence[str] = ()) -> None:
        super().__init__(message)
        self.detail_lines = list(detail_lines)


@dataclass
class StepOutcome:
    label: str
    status: str
    seconds: float


@dataclass
class StageOutcome:
    name: str
    steps: list[StepOutcome] = field(default_factory=list)

    @property
    def status(self) -> str:
        return "FAIL" if any(step.status == "FAIL" for step in self.steps) else "PASS"

    @property
    def seconds(self) -> float:
        return sum(step.seconds for step in self.steps)


@dataclass(frozen=True)
class StepSpec:
    """One command of a stage; `attempts` > 1 retries it (CI retries the tool restore once)."""

    label: str
    command: Sequence[str]
    cwd: Path
    environment: dict[str, str] | None = None
    attempts: int = 1


def run_specs(ctx: Context, stage_name: str, specs: Sequence[StepSpec]) -> StageOutcome:
    """Run the specs in order and stop at the first failing one."""
    outcome = StageOutcome(stage_name)
    for spec in specs:
        step = _run_spec(ctx, spec)
        outcome.steps.append(step)
        if step.status != "PASS":
            break
    return outcome


def run_action(ctx: Context, label: str, action: Callable[[], None]) -> StepOutcome:
    """Run a Python action as a step; StepFailure and ordinary errors become a FAIL."""
    ctx.say(f"[RUN ] {label}")
    started = time.monotonic()
    try:
        action()
        return _finish(ctx, label, started, True, [])
    except StepFailure as failure:
        return _finish(ctx, label, started, False, [str(failure), *failure.detail_lines])
    except Exception as error:  # a setup error must fail the step, not crash the gate
        return _finish(ctx, label, started, False, [f"{type(error).__name__}: {error}"])


def _run_spec(ctx: Context, spec: StepSpec) -> StepOutcome:
    ctx.say(f"[RUN ] {spec.label}")
    started = time.monotonic()
    executable = shutil.which(spec.command[0])
    if executable is None:
        return _finish(ctx, spec.label, started, False, [f"Required command not found: {spec.command[0]}"])
    environment = spec.environment if spec.environment is not None else ctx.environment
    result = None
    for _ in range(max(1, spec.attempts)):
        result = ctx.runner.run(spec.label, [executable, *spec.command[1:]], spec.cwd, environment)
        if result.return_code == 0:
            break
    lines = (result.stdout + "\n" + result.stderr).splitlines()
    return _finish(ctx, spec.label, started, result.return_code == 0, lines)


def _finish(ctx: Context, label: str, started: float, passed: bool, lines: Sequence[str]) -> StepOutcome:
    seconds = time.monotonic() - started
    status = "PASS" if passed else "FAIL"
    ctx.say(f"[{status}] {label} ({seconds:.1f}s)")
    if not passed:
        for line in [line for line in lines if line.strip()][-FAILURE_TAIL_LINES:]:
            ctx.say(f"       {line}")
    return StepOutcome(label, status, seconds)
