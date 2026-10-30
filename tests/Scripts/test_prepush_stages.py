"""scripts/prepush: validate, backend and e2e stage definitions, and their parity with the CI workflows."""

from __future__ import annotations

import re
import sys
import unittest
from unittest import mock

from scriptsupport import ROOT, SCRIPTS

from prepush import constants, stages
from prepush.steps import StageOutcome

WORKFLOWS = ROOT / ".github" / "workflows"


class StageHarness(unittest.TestCase):
    def run_stage(self, function, *, ref=None, status: str = "PASS"):  # noqa: ANN001
        captured: dict[str, object] = {}

        def fake_run_specs(ctx, name, specs):  # noqa: ANN001
            captured.update(ctx=ctx, name=name, specs=list(specs))
            return StageOutcome(name) if status == "PASS" else StageOutcome(name, [mock.Mock(status="FAIL", seconds=0.0)])

        ctx = object()
        with mock.patch.object(stages, "run_specs", fake_run_specs), mock.patch.object(stages, "upstream_ref", return_value=ref), \
                mock.patch.object(stages, "print_failed_suites") as printer:
            outcome = function(ctx)
        return outcome, captured, printer


class ValidateStageTests(StageHarness):
    def test_runs_the_full_validation_gate_with_security(self) -> None:
        _, captured, _ = self.run_stage(stages.validate)
        (spec,) = captured["specs"]
        self.assertEqual(captured["name"], "validate")
        self.assertEqual(spec.command, [sys.executable, str(SCRIPTS / "validate.py"), "--all", "--security"])
        self.assertEqual(spec.cwd, ROOT)


class BackendStageTests(StageHarness):
    def specs(self):
        return self.run_stage(stages.backend)[1]["specs"]

    def test_step_order(self) -> None:
        labels = [spec.label for spec in self.specs()]
        self.assertEqual(labels, [
            "python -m unittest tests/Scripts", "dotnet restore --locked-mode", "dotnet build --no-restore",
            "dotnet test --no-build", "dotnet tool restore", "dotnet-ef has-pending-model-changes"])

    def test_scripts_suite_runs_from_the_repository_root_with_the_current_interpreter(self) -> None:
        spec = self.specs()[0]
        self.assertEqual(list(spec.command), [sys.executable, "-m", "unittest", "discover", "-s", "tests/Scripts"])
        self.assertEqual(spec.cwd, ROOT)
        self.assertTrue((ROOT / "tests" / "Scripts").is_dir())

    def test_dotnet_steps_run_in_the_app_folder_and_only_the_tool_restore_retries(self) -> None:
        dotnet_specs = self.specs()[1:]
        self.assertTrue(all(spec.cwd == ROOT / "app" for spec in dotnet_specs))
        self.assertEqual({spec.label: spec.attempts for spec in dotnet_specs if spec.attempts != 1}, {"dotnet tool restore": 2})

    def test_commands_mirror_the_ci_backend_job(self) -> None:
        commands = {spec.label: list(spec.command) for spec in self.specs()}
        self.assertEqual(commands["dotnet restore --locked-mode"], ["dotnet", "restore", "--locked-mode"])
        self.assertEqual(commands["dotnet test --no-build"], ["dotnet", "test", "--no-build"])
        self.assertEqual(commands["dotnet-ef has-pending-model-changes"][-2:], ["--project", "AutoService.ApiService"])


class E2eStageTests(StageHarness):
    def command(self, ref):  # noqa: ANN001
        return list(self.run_stage(stages.e2e, ref=ref)[1]["specs"][0].command)

    def test_without_an_upstream_the_diff_base_is_the_default(self) -> None:
        command = self.command(None)
        self.assertEqual(command, [sys.executable, str(SCRIPTS / "select-e2e-specs.py"), "--run"])

    def test_with_an_upstream_the_diff_is_taken_against_it(self) -> None:
        self.assertEqual(self.command("origin/main")[-2:], ["--base", "origin/main"])

    def test_failed_suites_are_printed_only_on_failure(self) -> None:
        self.assertEqual(self.run_stage(stages.e2e, status="FAIL")[2].call_count, 1)
        self.assertEqual(self.run_stage(stages.e2e, status="PASS")[2].call_count, 0)


class WorkflowParityTests(unittest.TestCase):
    def test_gate_images_match_the_tests_workflow(self) -> None:
        text = (WORKFLOWS / "tests.yml").read_text(encoding="utf-8")
        self.assertEqual(re.search(r"^\s*POSTGRES_IMAGE:\s*(\S+)", text, re.MULTILINE).group(1), constants.POSTGRES_IMAGE)
        self.assertEqual(re.search(r"^\s*S3_IMAGE:\s*(\S+)", text, re.MULTILINE).group(1), constants.S3_IMAGE)

    def test_ci_build_origins_match_the_dotnet_workflow(self) -> None:
        text = (WORKFLOWS / "dotnet.yml").read_text(encoding="utf-8")
        self.assertEqual(re.search(r"^\s*VITE_API_URL:\s*(\S+)", text, re.MULTILINE).group(1), constants.CI_VITE_API_URL)
        self.assertEqual(re.search(r"^\s*VITE_SITE_URL:\s*(\S+)", text, re.MULTILINE).group(1), constants.CI_VITE_SITE_URL)

    def test_ci_runs_the_scripts_suite_with_the_same_discovery_command(self) -> None:
        text = (WORKFLOWS / "dotnet.yml").read_text(encoding="utf-8")
        self.assertIn("run: python -m unittest discover -s tests/Scripts", text)
        gate_job = text.split("repo-gate:")[1].split("backend-build:")[0]
        self.assertIn("actions/setup-python", gate_job)
        self.assertIn("python -m unittest discover -s tests/Scripts", gate_job)


if __name__ == "__main__":
    unittest.main()
