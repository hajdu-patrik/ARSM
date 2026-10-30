"""scripts/prepush: step execution and outcomes."""

from __future__ import annotations

import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest import mock

import scriptsupport  # noqa: F401  (puts scripts/ on sys.path)
from prepush import steps
from prepush.steps import StageOutcome, StepFailure, StepOutcome, StepSpec


class FakeRunner:
    def __init__(self, codes: list[int], stdout: str = "", stderr: str = "") -> None:
        self.codes, self.stdout, self.stderr = list(codes), stdout, stderr
        self.calls: list[tuple] = []

    def run(self, label, command, cwd, environment):  # noqa: ANN001
        self.calls.append((label, list(command), cwd, environment))
        code = self.codes.pop(0) if len(self.codes) > 1 else self.codes[0]
        return SimpleNamespace(return_code=code, stdout=self.stdout, stderr=self.stderr)


def make_ctx(runner: FakeRunner | None = None) -> SimpleNamespace:
    lines: list[str] = []
    return SimpleNamespace(say=lines.append, lines=lines, environment={"CTX": "1"}, runner=runner or FakeRunner([0]))


def which(name: str) -> str | None:
    return None if name == "missing-tool" else f"/resolved/{name}"


class OutcomeTests(unittest.TestCase):
    def test_empty_stage_passes_with_no_time(self) -> None:
        outcome = StageOutcome("x")
        self.assertEqual((outcome.status, outcome.seconds), ("PASS", 0))

    def test_one_failed_step_fails_the_stage_and_times_add_up(self) -> None:
        outcome = StageOutcome("x", [StepOutcome("a", "PASS", 1.5), StepOutcome("b", "FAIL", 2.0)])
        self.assertEqual((outcome.status, outcome.seconds), ("FAIL", 3.5))

    def test_step_failure_carries_detail_lines(self) -> None:
        failure = StepFailure("broke", ["more", "lines"])
        self.assertEqual((str(failure), failure.detail_lines), ("broke", ["more", "lines"]))
        self.assertEqual(StepFailure("plain").detail_lines, [])


class RunSpecTests(unittest.TestCase):
    def run_one(self, spec: StepSpec, runner: FakeRunner | None = None):
        ctx = make_ctx(runner)
        with mock.patch.object(steps.shutil, "which", which):
            return steps._run_spec(ctx, spec), ctx

    def test_missing_command_fails_without_running_anything(self) -> None:
        outcome, ctx = self.run_one(StepSpec("tool", ["missing-tool", "x"], Path(".")))
        self.assertEqual(outcome.status, "FAIL")
        self.assertEqual(ctx.runner.calls, [])
        self.assertIn("       Required command not found: missing-tool", ctx.lines)

    def test_success_runs_the_resolved_executable_in_the_context_environment(self) -> None:
        outcome, ctx = self.run_one(StepSpec("build", ["dotnet", "build", "--no-restore"], Path("/work")))
        self.assertEqual(outcome.status, "PASS")
        label, command, cwd, environment = ctx.runner.calls[0]
        self.assertEqual((label, command, cwd, environment), ("build", ["/resolved/dotnet", "build", "--no-restore"], Path("/work"), {"CTX": "1"}))
        self.assertEqual(ctx.lines[0], "[RUN ] build")
        self.assertRegex(ctx.lines[1], r"^\[PASS\] build \(\d+\.\ds\)$")

    def test_a_spec_environment_replaces_the_context_one(self) -> None:
        _, ctx = self.run_one(StepSpec("build", ["npm", "run"], Path("."), {"ONLY": "spec"}))
        self.assertEqual(ctx.runner.calls[0][3], {"ONLY": "spec"})

    def test_failure_prints_the_non_blank_output_tail(self) -> None:
        output = "\n".join(["", "first", "  ", *(f"line {index}" for index in range(100))])
        outcome, ctx = self.run_one(StepSpec("t", ["tool"], Path(".")), FakeRunner([1], stdout=output, stderr="err"))
        self.assertEqual(outcome.status, "FAIL")
        printed = [line for line in ctx.lines if line.startswith("       ")]
        self.assertEqual((len(printed), printed[0], printed[-1]), (60, "       line 41", "       err"))

    def test_retry_stops_at_the_first_success(self) -> None:
        outcome, ctx = self.run_one(StepSpec("restore", ["dotnet", "tool"], Path("."), attempts=3), FakeRunner([1, 0]))
        self.assertEqual((outcome.status, len(ctx.runner.calls)), ("PASS", 2))

    def test_retry_gives_up_after_all_attempts(self) -> None:
        outcome, ctx = self.run_one(StepSpec("restore", ["dotnet", "tool"], Path("."), attempts=2), FakeRunner([1]))
        self.assertEqual((outcome.status, len(ctx.runner.calls)), ("FAIL", 2))

    def test_zero_attempts_still_run_once(self) -> None:
        _, ctx = self.run_one(StepSpec("x", ["tool"], Path("."), attempts=0))
        self.assertEqual(len(ctx.runner.calls), 1)


class RunSpecsTests(unittest.TestCase):
    def test_runs_in_order_and_stops_at_the_first_failure(self) -> None:
        runner = FakeRunner([0, 1, 0])
        ctx = make_ctx(runner)
        specs = [StepSpec(name, ["tool"], Path(".")) for name in ("one", "two", "three")]
        with mock.patch.object(steps.shutil, "which", which):
            outcome = steps.run_specs(ctx, "stage", specs)
        self.assertEqual(outcome.name, "stage")
        self.assertEqual([(step.label, step.status) for step in outcome.steps], [("one", "PASS"), ("two", "FAIL")])
        self.assertEqual([call[0] for call in runner.calls], ["one", "two"])

    def test_all_passing_specs_pass_the_stage(self) -> None:
        ctx = make_ctx(FakeRunner([0]))
        with mock.patch.object(steps.shutil, "which", which):
            outcome = steps.run_specs(ctx, "stage", [StepSpec("a", ["tool"], Path(".")), StepSpec("b", ["tool"], Path("."))])
        self.assertEqual((outcome.status, len(outcome.steps)), ("PASS", 2))


class RunActionTests(unittest.TestCase):
    def test_success(self) -> None:
        ctx = make_ctx()
        done: list[bool] = []
        outcome = steps.run_action(ctx, "act", lambda: done.append(True))
        self.assertEqual((outcome.label, outcome.status, done), ("act", "PASS", [True]))
        self.assertEqual(ctx.lines[0], "[RUN ] act")

    def test_known_failure_prints_message_and_detail(self) -> None:
        def action() -> None:
            raise StepFailure("known problem", ["detail one"])

        ctx = make_ctx()
        self.assertEqual(steps.run_action(ctx, "act", action).status, "FAIL")
        self.assertIn("       known problem", ctx.lines)
        self.assertIn("       detail one", ctx.lines)

    def test_unexpected_error_fails_the_step_instead_of_crashing_the_gate(self) -> None:
        def action() -> None:
            raise ValueError("bad input")

        ctx = make_ctx()
        self.assertEqual(steps.run_action(ctx, "act", action).status, "FAIL")
        self.assertIn("       ValueError: bad input", ctx.lines)


if __name__ == "__main__":
    unittest.main()
