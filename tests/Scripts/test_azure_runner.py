"""azure_deploy.masking and azure_deploy.runner: secret masking and the az/docker/git subprocess runner."""

from __future__ import annotations

import subprocess
import unittest
from pathlib import Path
from unittest import mock

from scriptsupport import captured

from azure_deploy import runner as az_runner
from azure_deploy.errors import StepFailure
from azure_deploy.masking import REDACTED, SecretMasker, secret_values_of


class FakeProcess:
    def __init__(self, lines: list[str], code: int) -> None:
        self.stdout, self._code = iter(lines), code

    def wait(self) -> int:
        return self._code


class SecretMaskerTests(unittest.TestCase):
    def test_placeholder(self) -> None:
        self.assertEqual(REDACTED, "<redacted>")

    def test_values_below_four_characters_are_not_masked(self) -> None:
        masker = SecretMasker(["abc", "abcd"])
        self.assertEqual(masker.mask("abc abcd"), f"abc {REDACTED}")

    def test_longest_value_is_replaced_first(self) -> None:
        masker = SecretMasker(["abcd", "abcd1234"])
        self.assertEqual(masker.mask("v abcd1234 w"), f"v {REDACTED} w")

    def test_add_merges_values_and_keeps_the_longest_first_order(self) -> None:
        masker = SecretMasker(["abcd"])
        masker.add(["abcd1234", "xy"])
        self.assertEqual(masker.mask("abcd1234 abcd xy"), f"{REDACTED} {REDACTED} xy")

    def test_empty_masker_leaves_clean_text_alone(self) -> None:
        self.assertEqual(SecretMasker().mask("deploying arsm-api"), "deploying arsm-api")

    def test_postgres_uris_assignments_and_json_fields(self) -> None:
        masker = SecretMasker()
        self.assertEqual(masker.mask("db postgres://u:p@h:5432/d end"), f"db postgresql://{REDACTED} end")
        self.assertEqual(masker.mask("password=abc12345"), f"password={REDACTED}")
        self.assertEqual(masker.mask('{"accessToken": "abc12345"}'), f'{{"accessToken": "{REDACTED}"}}')

    def test_secret_values_of_selects_sensitively_named_keys(self) -> None:
        env = {"ARSM_JWT_SECRET": "s1", "DB_PASSWORD": "p1", "HARMLESS": "visible", "API_KEY": "k1"}
        self.assertEqual(sorted(secret_values_of(env)), ["k1", "p1", "s1"])


class DryRunTests(unittest.TestCase):
    def run_dry(self, args: list[str], masker: SecretMasker | None = None, **kwargs: object):
        runner = az_runner.CommandRunner(masker or SecretMasker(), dry_run=True)
        guards = (mock.patch.object(az_runner.subprocess, "run", side_effect=AssertionError("ran")),
                  mock.patch.object(az_runner.subprocess, "Popen", side_effect=AssertionError("ran")))
        with guards[0], guards[1], captured() as (out, _):
            result = runner.run(args, **kwargs)
        return result, out.getvalue().splitlines()

    def test_dry_run_prints_the_command_and_runs_nothing(self) -> None:
        result, lines = self.run_dry(["az", "group", "create", "--name", "rg one"])
        self.assertEqual(result.stdout, "")
        self.assertEqual(lines, ["[dry-run] az group create --name 'rg one'"])

    def test_environment_values_for_the_child_are_never_printed(self) -> None:
        _, lines = self.run_dry(["az", "x"], env_extra={"ZED": "z-secret-value", "ALPHA": "a-secret-value"})
        self.assertEqual(lines[1], "          env passed to the child only: ALPHA, ZED (values hidden)")
        self.assertNotIn("secret-value", " ".join(lines))

    def test_secrets_in_arguments_are_masked(self) -> None:
        _, lines = self.run_dry(["az", "login", "--p", "hunter2value"], SecretMasker(["hunter2value"]))
        self.assertNotIn("hunter2value", lines[0])

    def test_read_only_commands_still_run_in_dry_run(self) -> None:
        runner = az_runner.CommandRunner(SecretMasker(), dry_run=True)
        done = subprocess.CompletedProcess([], 0, "sha\n", "")
        with mock.patch.object(az_runner.subprocess, "run", return_value=done) as run, mock.patch.object(az_runner.shutil, "which", return_value=None), captured():
            result = runner.run(["git", "rev-parse", "HEAD"], capture=True, read_only=True)
        self.assertEqual(result.stdout, "sha\n")
        run.assert_called_once()


class LiveRunTests(unittest.TestCase):
    def setUp(self) -> None:
        patcher = mock.patch.object(az_runner.shutil, "which", return_value=None)
        patcher.start()
        self.addCleanup(patcher.stop)
        self.runner = az_runner.CommandRunner(SecretMasker(["topsecret1"]))

    def test_captured_run_returns_stdout_and_masks_stderr(self) -> None:
        done = subprocess.CompletedProcess([], 0, "payload\n", "warning topsecret1\n")
        with mock.patch.object(az_runner.subprocess, "run", return_value=done) as run, captured() as (out, err):
            result = self.runner.run(["az", "show"], capture=True, env_extra={"K": "v"}, cwd=Path("/work"))
        self.assertEqual(result.stdout, "payload\n")
        self.assertEqual(out.getvalue().splitlines(), ["$ az show"])
        self.assertEqual(err.getvalue().strip(), f"warning {REDACTED}")
        kwargs = run.call_args.kwargs
        self.assertEqual((kwargs["env"]["K"], kwargs["cwd"]), ("v", Path("/work")))

    def test_environment_extra_reaches_only_the_child(self) -> None:
        done = subprocess.CompletedProcess([], 0, "", "")
        with mock.patch.object(az_runner.subprocess, "run", return_value=done), captured():
            self.runner.run(["az", "x"], capture=True, env_extra={"ARSM_ONLY_FOR_CHILD": "1"})
        self.assertNotIn("ARSM_ONLY_FOR_CHILD", az_runner.os.environ)

    def test_failed_command_raises_with_the_tool_name_and_code(self) -> None:
        done = subprocess.CompletedProcess([], 3, "", "")
        with mock.patch.object(az_runner.subprocess, "run", return_value=done), captured():
            with self.assertRaisesRegex(StepFailure, r"^az exited with code 3\.$"):
                self.runner.run(["az", "x"], capture=True)

    def test_tool_name_is_the_stem_of_the_resolved_executable(self) -> None:
        with mock.patch.object(az_runner.shutil, "which", return_value="C:/tools/az.cmd"):
            done = subprocess.CompletedProcess([], 1, "", "")
            with mock.patch.object(az_runner.subprocess, "run", return_value=done), captured():
                with self.assertRaisesRegex(StepFailure, r"^az exited with code 1\.$"):
                    self.runner.run(["az", "x"], capture=True)

    def test_streamed_output_is_masked_line_by_line(self) -> None:
        process = FakeProcess(["line one\n", "token topsecret1 here\n"], 0)
        with mock.patch.object(az_runner.subprocess, "Popen", return_value=process), captured() as (out, _):
            result = self.runner.run(["docker", "build", "."])
        self.assertEqual(result.stdout, "")
        self.assertEqual(out.getvalue().splitlines(), ["$ docker build .", "line one", f"token {REDACTED} here"])

    def test_streamed_failure_raises(self) -> None:
        with mock.patch.object(az_runner.subprocess, "Popen", return_value=FakeProcess([], 2)), captured():
            with self.assertRaisesRegex(StepFailure, r"docker exited with code 2"):
                self.runner.run(["docker", "push", "x"])

    def test_a_missing_tool_is_a_step_failure_in_both_modes(self) -> None:
        with captured():
            with mock.patch.object(az_runner.subprocess, "Popen", side_effect=FileNotFoundError):
                with self.assertRaisesRegex(StepFailure, "az is not installed or not on PATH"):
                    self.runner.run(["az", "x"])
            with mock.patch.object(az_runner.subprocess, "run", side_effect=FileNotFoundError):
                with self.assertRaisesRegex(StepFailure, "az is not installed or not on PATH"):
                    self.runner.run(["az", "x"], capture=True)

    def test_say_masks_before_printing(self) -> None:
        with captured() as (out, _):
            self.runner.say("value topsecret1")
        self.assertEqual(out.getvalue(), f"value {REDACTED}\n")


if __name__ == "__main__":
    unittest.main()
