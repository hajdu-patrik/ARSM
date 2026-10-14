"""Summary table and failed-suite details read from the already sanitized runner report."""

from __future__ import annotations

import json
from typing import Sequence

from .constants import STAGE_NAMES
from .environment import ARTIFACTS, Context
from .steps import StageOutcome

SUITE_TAIL_LINES = 20
HEADER = ("Stage", "Step", "Result", "Time")


def render_summary(selected: Sequence[str], outcomes: Sequence[StageOutcome]) -> str:
    """One row per step; stages that did not run show SKIP with the reason."""
    done = {outcome.name: outcome for outcome in outcomes}
    rows: list[tuple[str, ...]] = [HEADER]
    for name in STAGE_NAMES:
        outcome = done.get(name)
        if outcome is not None and outcome.steps:
            for index, step in enumerate(outcome.steps):
                rows.append((name if index == 0 else "", step.label, step.status, f"{step.seconds:.1f}s"))
        else:
            rows.append((name, "not selected" if name not in selected else "not reached", "SKIP", "-"))
    widths = [max(len(row[column]) for row in rows) for column in range(len(HEADER))]
    lines = [" | ".join(cell.ljust(widths[index]) for index, cell in enumerate(row)).rstrip() for row in rows]
    lines.insert(1, "-+-".join("-" * width for width in widths))
    passed = len(outcomes) == len(selected) and all(outcome.status == "PASS" for outcome in outcomes)
    total = sum(outcome.seconds for outcome in outcomes)
    return "\n".join(["", "Pre-push summary", *lines, f"Total {total:.1f}s - pre-push gate {'PASSED' if passed else 'FAILED'}"])


def print_failed_suites(ctx: Context) -> None:
    """Show the failed suites of tests/.artifacts/test-suite-summary.json (sanitized by the runner)."""
    report = ARTIFACTS / "test-suite-summary.json"
    if not report.is_file():
        return
    try:
        results = json.loads(report.read_text(encoding="utf-8"))["results"]
    except (OSError, ValueError, KeyError):
        return
    for suite in results:
        if suite.get("status") == "passed":
            continue
        ctx.say(f"       suite {suite.get('name')}: {suite.get('status')}")
        for failure in suite.get("details", {}).get("failedHttpRequests", [])[:10]:
            ctx.say(f"         {failure.get('file')}:{failure.get('line')} {failure.get('title')} -> {failure.get('actualStatus')}")
        for line in suite.get("output_tail", [])[-SUITE_TAIL_LINES:]:
            ctx.say(f"         {line}")
