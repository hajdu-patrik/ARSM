"""Command line of the pre-push gate: stage selection, fail-fast loop, signals and summary."""

from __future__ import annotations

import argparse
import signal
import sys
from typing import Callable, Sequence

from . import api_suites, frontend, stages
from .constants import STAGE_NAMES
from .environment import Context, build_context
from .report import render_summary
from .steps import StageOutcome

STAGES: dict[str, Callable[[Context], StageOutcome]] = {
    "validate": stages.validate,
    "backend": stages.backend,
    "frontend": frontend.run,
    "e2e": stages.e2e,
    "api-suites": api_suites.run,
}
EXIT_PASS, EXIT_FAIL, EXIT_SETUP, EXIT_INTERRUPTED = 0, 1, 2, 130


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="pre-push.py",
        description="Mandatory local pre-push gate that mirrors CI; the git hook always runs every stage. "
        f"Stages in order: {', '.join(STAGE_NAMES)}. Exit 0 pass, 1 failure, 2 setup error, 130 interrupted.",
    )
    parser.add_argument("--skip-e2e", action="store_true", help="Skip the e2e stage.")
    parser.add_argument("--skip-api-suites", action="store_true", help="Skip the api-suites stage (HTTP and SQL on the disposable stack).")
    parser.add_argument("--only", choices=STAGE_NAMES, help="Run only this stage.")
    return parser


def select_stages(args: argparse.Namespace, parser: argparse.ArgumentParser) -> list[str]:
    names = [args.only] if args.only else list(STAGE_NAMES)
    if args.skip_e2e:
        names = [name for name in names if name != "e2e"]
    if args.skip_api_suites:
        names = [name for name in names if name != "api-suites"]
    if not names:
        parser.error("no stage left to run after --only / --skip-* were applied")
    return names


def _raise_interrupt(_signum: int, _frame: object) -> None:
    raise KeyboardInterrupt


def install_signal_handlers() -> None:
    """Route SIGTERM and friends through KeyboardInterrupt so every finally block cleans up."""
    for name in ("SIGTERM", "SIGBREAK", "SIGHUP"):
        number = getattr(signal, name, None)
        if number is not None:
            signal.signal(number, _raise_interrupt)


def run_stages(ctx: Context, selected: Sequence[str], outcomes: list[StageOutcome]) -> bool:
    """Run the selected stages in order, stopping at the first failure; True when all passed."""
    for name in selected:
        ctx.say(f"\n=== Stage: {name} ===")
        outcome = STAGES[name](ctx)
        outcomes.append(outcome)
        if outcome.status != "PASS":
            return False
    return True


def main(argv: Sequence[str] | None = None) -> int:
    parser = build_parser()
    selected = select_stages(parser.parse_args(argv), parser)
    for stream in (sys.stdout, sys.stderr):
        stream.reconfigure(errors="replace")
    try:
        ctx = build_context()
    except Exception as error:
        print(f"[FAIL] pre-push setup: {type(error).__name__}: {error}", file=sys.stderr)
        return EXIT_SETUP
    install_signal_handlers()
    outcomes: list[StageOutcome] = []
    interrupted = False
    try:
        passed = run_stages(ctx, selected, outcomes)
    except KeyboardInterrupt:
        interrupted, passed = True, False
        ctx.say("\n[FAIL] Interrupted; the disposable stack was cleaned up.")
    ctx.say(render_summary(selected, outcomes))
    if interrupted:
        return EXIT_INTERRUPTED
    return EXIT_PASS if passed else EXIT_FAIL
