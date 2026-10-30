"""scripts/prepush/cli.py: argument parsing, stage selection, fail-fast loop, signals and exit codes."""

from __future__ import annotations

import signal
import unittest
from types import SimpleNamespace
from unittest import mock

from scriptsupport import captured

from prepush import cli
from prepush.constants import STAGE_NAMES
from prepush.steps import StageOutcome, StepOutcome


def stage_outcome(name: str, status: str = "PASS") -> StageOutcome:
    return StageOutcome(name, [StepOutcome(f"{name} step", status, 0.5)])


def fake_ctx() -> SimpleNamespace:
    lines: list[str] = []
    return SimpleNamespace(say=lines.append, lines=lines)


class ParserTests(unittest.TestCase):
    def select(self, *argv: str) -> list[str]:
        parser = cli.build_parser()
        return cli.select_stages(parser.parse_args(list(argv)), parser)

    def test_stage_registry_matches_the_documented_order(self) -> None:
        self.assertEqual(list(cli.STAGES), list(STAGE_NAMES))
        self.assertTrue(all(callable(function) for function in cli.STAGES.values()))

    def test_default_runs_every_stage_in_order(self) -> None:
        self.assertEqual(self.select(), list(STAGE_NAMES))

    def test_only_selects_a_single_stage(self) -> None:
        for name in STAGE_NAMES:
            with self.subTest(name=name):
                self.assertEqual(self.select("--only", name), [name])

    def test_skip_flags_remove_their_stage(self) -> None:
        self.assertEqual(self.select("--skip-e2e"), ["validate", "backend", "frontend", "api-suites"])
        self.assertEqual(self.select("--skip-api-suites"), ["validate", "backend", "frontend", "e2e"])
        self.assertEqual(self.select("--skip-e2e", "--skip-api-suites"), ["validate", "backend", "frontend"])

    def test_skip_flags_apply_after_only(self) -> None:
        self.assertEqual(self.select("--only", "backend", "--skip-e2e"), ["backend"])

    def test_nothing_left_to_run_is_a_usage_error(self) -> None:
        with captured() as (_, err), self.assertRaises(SystemExit) as raised:
            self.select("--only", "e2e", "--skip-e2e")
        self.assertEqual(raised.exception.code, 2)
        self.assertIn("no stage left to run", err.getvalue())

    def test_unknown_stage_is_a_usage_error(self) -> None:
        with captured(), self.assertRaises(SystemExit) as raised:
            cli.build_parser().parse_args(["--only", "deploy"])
        self.assertEqual(raised.exception.code, 2)

    def test_help_documents_every_stage_and_the_exit_codes(self) -> None:
        description = cli.build_parser().description
        for name in STAGE_NAMES:
            self.assertIn(name, description)
        self.assertIn("130", description)


class RunStagesTests(unittest.TestCase):
    def run_with(self, results: dict[str, str], selected: list[str]):
        called: list[str] = []

        def make(name: str):  # noqa: ANN202
            def stage(ctx):  # noqa: ANN001
                called.append(name)
                return stage_outcome(name, results.get(name, "PASS"))

            return stage

        ctx, outcomes = fake_ctx(), []
        with mock.patch.dict(cli.STAGES, {name: make(name) for name in STAGE_NAMES}):
            passed = cli.run_stages(ctx, selected, outcomes)
        return passed, called, outcomes, ctx

    def test_all_selected_stages_run_in_the_given_order(self) -> None:
        passed, called, outcomes, ctx = self.run_with({}, ["backend", "validate"])
        self.assertEqual((passed, called, len(outcomes)), (True, ["backend", "validate"], 2))
        self.assertEqual(ctx.lines, ["\n=== Stage: backend ===", "\n=== Stage: validate ==="])

    def test_the_first_failing_stage_stops_the_gate(self) -> None:
        passed, called, outcomes, _ = self.run_with({"backend": "FAIL"}, list(STAGE_NAMES))
        self.assertEqual((passed, called), (False, ["validate", "backend"]))
        self.assertEqual(outcomes[-1].status, "FAIL")


class SignalTests(unittest.TestCase):
    def test_interrupt_handler_raises_keyboard_interrupt(self) -> None:
        with self.assertRaises(KeyboardInterrupt):
            cli._raise_interrupt(15, None)

    def test_termination_signals_are_routed_through_the_handler(self) -> None:
        with mock.patch.object(cli.signal, "signal") as register:
            cli.install_signal_handlers()
        expected = {getattr(signal, name) for name in ("SIGTERM", "SIGBREAK", "SIGHUP") if hasattr(signal, name)}
        self.assertEqual({call.args[0] for call in register.call_args_list}, expected)
        self.assertTrue(all(call.args[1] is cli._raise_interrupt for call in register.call_args_list))


class MainTests(unittest.TestCase):
    def run_main(self, argv: list[str], *, passed: object = True, context_error: Exception | None = None):
        ctx = fake_ctx()
        if context_error is not None:
            build = mock.patch.object(cli, "build_context", side_effect=context_error)
        else:
            build = mock.patch.object(cli, "build_context", return_value=ctx)
        if isinstance(passed, BaseException):
            stages_patch = mock.patch.object(cli, "run_stages", side_effect=passed)
        else:
            stages_patch = mock.patch.object(cli, "run_stages", return_value=passed)
        with build, mock.patch.object(cli, "install_signal_handlers"), stages_patch as run, captured() as (_, err):
            code = cli.main(argv)
        return code, ctx, run, err.getvalue()

    def test_passing_run_exits_0_and_prints_the_summary(self) -> None:
        code, ctx, run, _ = self.run_main(["--only", "validate"])
        self.assertEqual(code, 0)
        self.assertEqual(run.call_args.args[1], ["validate"])
        self.assertIn("pre-push gate", ctx.lines[-1])

    def test_failing_run_exits_1(self) -> None:
        self.assertEqual(self.run_main([], passed=False)[0], 1)

    def test_setup_error_exits_2_with_the_error_type(self) -> None:
        code, _, run, err = self.run_main([], context_error=OSError("no secrets"))
        self.assertEqual(code, 2)
        self.assertIn("[FAIL] pre-push setup: OSError: no secrets", err)
        run.assert_not_called()

    def test_interruption_exits_130_and_still_prints_the_summary(self) -> None:
        code, ctx, _, _ = self.run_main([], passed=KeyboardInterrupt())
        self.assertEqual(code, 130)
        self.assertTrue(any("Interrupted" in line for line in ctx.lines))
        self.assertIn("FAILED", ctx.lines[-1])

    def test_invalid_arguments_exit_before_any_setup(self) -> None:
        with mock.patch.object(cli, "build_context") as build, captured(), self.assertRaises(SystemExit):
            cli.main(["--only", "nope"])
        build.assert_not_called()

    def test_exit_code_constants(self) -> None:
        self.assertEqual((cli.EXIT_PASS, cli.EXIT_FAIL, cli.EXIT_SETUP, cli.EXIT_INTERRUPTED), (0, 1, 2, 130))


if __name__ == "__main__":
    unittest.main()
