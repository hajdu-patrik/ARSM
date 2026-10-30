"""scripts/prepush: gitref helpers and the pre-push context (secrets are never read from the real files)."""

from __future__ import annotations

import os
import subprocess
import sys
import unittest
from unittest import mock

import scriptsupport  # noqa: F401  (puts scripts/ on sys.path)
from scriptsupport import ROOT, SCRIPTS, WEBUI, captured
from prepush import constants, environment, gitref


def git_result(returncode: int = 0, stdout: str = "") -> subprocess.CompletedProcess[str]:
    return subprocess.CompletedProcess([], returncode, stdout, "")


class UpstreamRefTests(unittest.TestCase):
    def ref(self, *results: subprocess.CompletedProcess[str]):
        with mock.patch.object(gitref, "_git", side_effect=list(results)) as git:
            return gitref.upstream_ref(), git

    def test_tracking_branch_wins(self) -> None:
        ref, git = self.ref(git_result(0, "origin/feature\n"))
        self.assertEqual(ref, "origin/feature")
        git.assert_called_once_with("rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}")

    def test_falls_back_to_origin_main(self) -> None:
        for first in (git_result(128), git_result(0, "  \n")):
            with self.subTest(first=first.returncode):
                ref, git = self.ref(first, git_result(0, "sha\n"))
                self.assertEqual(ref, "origin/main")
                self.assertEqual(git.call_args.args, ("rev-parse", "--verify", "--quiet", "origin/main"))

    def test_none_without_upstream_and_origin_main(self) -> None:
        self.assertIsNone(self.ref(git_result(128), git_result(1))[0])


class PathDiffersTests(unittest.TestCase):
    def test_exit_code_decides(self) -> None:
        for code, expected in ((0, False), (1, True), (128, True)):
            with self.subTest(code=code), mock.patch.object(gitref, "_git", return_value=git_result(code)) as git:
                self.assertEqual(gitref.path_differs("origin/main", "some/file"), expected)
                git.assert_called_once_with("diff", "--quiet", "origin/main", "--", "some/file")


class PathConstantsTests(unittest.TestCase):
    def test_paths_point_into_the_repository(self) -> None:
        self.assertEqual(environment.ROOT, ROOT)
        self.assertEqual(environment.SCRIPTS, SCRIPTS)
        self.assertEqual(environment.WEBUI, WEBUI)
        self.assertEqual(environment.APP, ROOT / "app")
        self.assertEqual(environment.ARTIFACTS, ROOT / "tests" / ".artifacts")
        self.assertTrue((environment.SCRIPTS / "run-local-test-suite.py").is_file())


class ContextTests(unittest.TestCase):
    def test_say_prints_sanitized_text(self) -> None:
        sanitizer = mock.Mock()
        sanitizer.sanitize.side_effect = lambda text: text.replace("hunter2x", "<redacted>")
        ctx = environment.Context(mock.Mock(), {}, sanitizer, mock.Mock(), mock.Mock())
        with captured() as (out, _):
            ctx.say("value hunter2x")
        self.assertEqual(out.getvalue(), "value <redacted>\n")


class RunnerModuleTests(unittest.TestCase):
    def test_load_runner_module_registers_the_dashed_script(self) -> None:
        module = environment.load_runner_module()
        self.assertIs(sys.modules["run_local_test_suite"], module)
        for name in ("LocalTestRunner", "CommandRunner", "write_report", "PYTHON_HTTP_CHECKS"):
            self.assertTrue(hasattr(module, name), name)

    def test_load_runner_module_fails_clearly_without_a_spec(self) -> None:
        with mock.patch.object(environment.importlib.util, "spec_from_file_location", return_value=None):
            with self.assertRaisesRegex(RuntimeError, "cannot be imported"):
                environment.load_runner_module()


class BuildContextTests(unittest.TestCase):
    class FakeLoader:
        secret = "loaded-secret-value"

        def __init__(self, root: object) -> None:
            self.root = root

        def load(self, env: dict[str, str]) -> list[str]:
            env["FROM_SECRETS"] = "yes"
            return [self.secret]

    def build(self, process_env: dict[str, str]):
        with mock.patch.dict(os.environ, process_env, clear=True), \
                mock.patch.object(environment, "EnvironmentLoader", self.FakeLoader):
            return environment.build_context()

    def test_context_wires_secrets_credentials_and_the_runner(self) -> None:
        ctx = self.build({"PATH": "x"})
        self.assertEqual(ctx.environment["FROM_SECRETS"], "yes")
        self.assertIs(ctx.runner.sanitizer, ctx.sanitizer)
        self.assertIsInstance(ctx.runner, ctx.runner_module.CommandRunner)

    def test_loaded_and_generated_secrets_are_masked(self) -> None:
        ctx = self.build({})
        self.assertNotIn(self.FakeLoader.secret, ctx.sanitizer.sanitize(f"x {self.FakeLoader.secret} y"))
        for generated in ctx.credentials.values():
            self.assertNotIn(generated, ctx.sanitizer.sanitize(f"x {generated} y"))

    def test_slow_stage_timeouts_default_but_a_developer_value_wins(self) -> None:
        defaults = self.build({}).environment
        self.assertEqual(defaults["ARSM_TEST_COMMAND_TIMEOUT_SECONDS"], constants.DEFAULT_COMMAND_TIMEOUT_SECONDS)
        self.assertEqual(defaults["ARSM_VALIDATE_TIMEOUT_SECONDS"], constants.DEFAULT_VALIDATE_TIMEOUT_SECONDS)
        custom = self.build({"ARSM_TEST_COMMAND_TIMEOUT_SECONDS": "42", "ARSM_VALIDATE_TIMEOUT_SECONDS": "43"}).environment
        self.assertEqual((custom["ARSM_TEST_COMMAND_TIMEOUT_SECONDS"], custom["ARSM_VALIDATE_TIMEOUT_SECONDS"]), ("42", "43"))


if __name__ == "__main__":
    unittest.main()
