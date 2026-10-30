"""validate.py git helpers, run_command and the frontend, backend and security stages (tools mocked)."""

from __future__ import annotations

import subprocess
import unittest
from unittest import mock

from scriptsupport import TempDirCase

import validate

WEBUI = validate.WEBUI_PREFIX


def completed(returncode: int = 0, stdout: str = "", stderr: str = "") -> subprocess.CompletedProcess[str]:
    return subprocess.CompletedProcess([], returncode, stdout, stderr)


class GitHelperTests(TempDirCase):
    def test_git_lines_strips_and_drops_blank_lines(self) -> None:
        with mock.patch.object(validate.subprocess, "run", return_value=completed(stdout="a\n\n  b  \n")) as run:
            self.assertEqual(validate.git_lines("ls-files"), ["a", "b"])
        self.assertEqual(run.call_args.args[0], ["git", "ls-files"])

    def test_git_lines_raises_on_git_failure(self) -> None:
        with mock.patch.object(validate.subprocess, "run", return_value=completed(128)):
            with self.assertRaisesRegex(RuntimeError, "git diff --name-only HEAD failed"):
                validate.git_lines("diff", "--name-only", "HEAD")

    def test_changed_files_merges_tracked_and_untracked_and_drops_deleted(self) -> None:
        self.write("a.txt")
        self.write("b.txt")
        answers = {"diff": ["a.txt", "gone.txt"], "ls-files": ["b.txt", "a.txt"]}
        calls: list[tuple[str, ...]] = []

        def fake_git(*args: str) -> list[str]:
            calls.append(args)
            return answers[args[0]]

        with mock.patch.object(validate, "ROOT", self.tmp), mock.patch.object(validate, "git_lines", fake_git):
            self.assertEqual(validate.changed_files("origin/main"), ["a.txt", "b.txt"])
        self.assertIn(("diff", "--name-only", "origin/main"), calls)
        self.assertIn(("ls-files", "--others", "--exclude-standard"), calls)

    def test_all_files_is_sorted_tracked_files(self) -> None:
        with mock.patch.object(validate, "git_lines", return_value=["b", "a"]) as lines:
            self.assertEqual(validate.all_files(), ["a", "b"])
        lines.assert_called_once_with("ls-files")


class RunCommandTests(unittest.TestCase):
    def test_missing_executable(self) -> None:
        with mock.patch.object(validate.shutil, "which", return_value=None):
            self.assertEqual(validate.run_command(["nope", "x"], validate.ROOT), (False, ["nope was not found on PATH."]))

    def test_success_and_failure_follow_the_return_code(self) -> None:
        with mock.patch.object(validate.shutil, "which", return_value="/bin/tool"):
            with mock.patch.object(validate.subprocess, "run", return_value=completed(0, "ok\n")):
                self.assertEqual(validate.run_command(["tool"], validate.ROOT), (True, ["ok"]))
            with mock.patch.object(validate.subprocess, "run", return_value=completed(1, "out\n", "err\n")):
                self.assertEqual(validate.run_command(["tool"], validate.ROOT), (False, ["out", "err"]))

    def test_output_drops_npm_notice_lines_and_keeps_the_last_40(self) -> None:
        text = "\n".join([*(f"line {index}" for index in range(60)), "npm notice update"])
        with mock.patch.object(validate.shutil, "which", return_value="/bin/tool"):
            with mock.patch.object(validate.subprocess, "run", return_value=completed(0, text)):
                _, lines = validate.run_command(["tool"], validate.ROOT)
        self.assertEqual(len(lines), 40)
        self.assertEqual(lines[-1], "line 59")

    def test_timeout_is_a_failure_not_an_exception(self) -> None:
        error = subprocess.TimeoutExpired("tool", 1)
        with mock.patch.object(validate.shutil, "which", return_value="/bin/tool"):
            with mock.patch.object(validate.subprocess, "run", side_effect=error):
                ok, lines = validate.run_command(["tool", "arg"], validate.ROOT)
        self.assertFalse(ok)
        self.assertIn("timed out", lines[0])


class FrontendStageTests(unittest.TestCase):
    def run_stage(self, files: list[str], full: bool = False, skip: bool = False, ok: bool = True):
        calls: list[list[str]] = []

        def fake(command, cwd):  # noqa: ANN001
            calls.append(list(command))
            return (ok, ["boom"]) if not ok else (True, [])

        with mock.patch.object(validate, "run_command", fake):
            return validate.stage_frontend(files, full, skip), calls

    def test_skips_without_webui_files_or_with_skip_build(self) -> None:
        self.assertEqual(self.run_stage(["app/AutoService.ApiService/A.cs"])[0].status, "SKIP")
        self.assertEqual(self.run_stage([WEBUI + "src/a.ts"], skip=True)[0].status, "SKIP")

    def test_diff_mode_lints_only_changed_ts_files_relative_to_the_webui(self) -> None:
        result, calls = self.run_stage([WEBUI + "src/a.ts", WEBUI + "src/b.tsx", WEBUI + "src/c.css"])
        self.assertEqual(result.status, "PASS")
        self.assertEqual(calls[0], ["npx", "tsc", "-b", "--noEmit"])
        self.assertEqual(calls[1], ["npx", "eslint", "src/a.ts", "src/b.tsx"])

    def test_full_mode_lints_the_whole_project(self) -> None:
        _, calls = self.run_stage([WEBUI + "src/a.ts"], full=True)
        self.assertEqual(calls[1], ["npx", "eslint", "."])

    def test_no_ts_changes_means_no_eslint_call(self) -> None:
        result, calls = self.run_stage([WEBUI + "src/c.css"])
        self.assertEqual((result.status, len(calls)), ("PASS", 1))

    def test_eslint_runs_in_batches_of_60(self) -> None:
        files = [f"{WEBUI}src/f{index}.ts" for index in range(61)]
        _, calls = self.run_stage(files)
        lint_calls = [call for call in calls if call[1] == "eslint"]
        self.assertEqual([len(call) - 2 for call in lint_calls], [60, 1])

    def test_failures_are_reported_per_tool(self) -> None:
        result, _ = self.run_stage([WEBUI + "src/a.ts"], ok=False)
        self.assertEqual(result.status, "FAIL")
        self.assertEqual(result.detail, ["tsc:", "boom", "eslint:", "boom"])


class BackendStageTests(unittest.TestCase):
    def run_stage(self, files: list[str], skip: bool = False, ok: bool = True):
        with mock.patch.object(validate, "run_command", return_value=(ok, ["build output"])) as run:
            return validate.stage_backend(files, skip), run

    def test_skips_without_backend_files_or_with_skip_build(self) -> None:
        result, run = self.run_stage(["README.md"])
        self.assertEqual(result.status, "SKIP")
        run.assert_not_called()
        self.assertEqual(self.run_stage(["app/AutoService.ApiService/A.cs"], skip=True)[0].status, "SKIP")

    def test_every_backend_prefix_and_root_file_triggers_the_build(self) -> None:
        for path in (*validate.BACKEND_ROOT_FILES, "app/AutoService.ApiService/A.cs", "app/AutoService.AppHost/A.cs",
                     "app/AutoService.ServiceDefaults/A.cs", "tests/AutoService.UnitTests/A.cs"):
            with self.subTest(path=path):
                self.assertEqual(self.run_stage([path])[0].status, "PASS")

    def test_build_command_and_failure_detail(self) -> None:
        result, run = self.run_stage(["app/AutoService.ApiService/A.cs"], ok=False)
        self.assertEqual((result.status, result.detail), ("FAIL", ["build output"]))
        self.assertEqual(run.call_args.args[0], ["dotnet", "build", "--nologo", "-v", "q"])


class SecurityStageTests(unittest.TestCase):
    def run_stage(self, files: list[str], forced: bool = False, failing: tuple[str, ...] = (), dotnet_out=None):
        calls: list[str] = []

        def fake(command, cwd):  # noqa: ANN001
            calls.append(" ".join(command))
            joined = " ".join(command)
            if joined.startswith("dotnet"):
                return (False, ["x"]) if "dotnet" in failing else (True, dotnet_out or ["No vulnerable packages."])
            return (False, ["fail"]) if any(joined == name for name in failing) else (True, [])

        with mock.patch.object(validate, "run_command", fake):
            return validate.stage_security(files, forced), calls

    def test_skips_without_manifest_changes(self) -> None:
        result, calls = self.run_stage(["app/AutoService.WebUI/src/a.ts"])
        self.assertEqual((result.status, calls), ("SKIP", []))

    def test_frontend_manifest_runs_fix_audit_and_signatures(self) -> None:
        result, calls = self.run_stage(["app/AutoService.WebUI/package-lock.json"])
        self.assertEqual(result.status, "PASS")
        self.assertEqual(calls, ["npm audit fix", "npm audit --audit-level=high", "npm audit signatures"])

    def test_backend_manifests_run_the_vulnerability_listing(self) -> None:
        for path in ("app/A/A.csproj", "app/Directory.Packages.props", "app/A/packages.lock.json", "app/Directory.Build.props"):
            with self.subTest(path=path):
                result, calls = self.run_stage([path])
                self.assertEqual((result.status, len(calls)), ("PASS", 1))
                self.assertTrue(calls[0].startswith("dotnet list package --vulnerable"))

    def test_forced_runs_both_sides(self) -> None:
        _, calls = self.run_stage([], forced=True)
        self.assertEqual(len(calls), 4)

    def test_failed_audit_fails_the_stage(self) -> None:
        result, _ = self.run_stage([], forced=True, failing=("npm audit --audit-level=high",))
        self.assertEqual(result.status, "FAIL")
        self.assertEqual(result.detail[0], "npm audit (after fix):")

    def test_failed_signature_check_fails_the_stage(self) -> None:
        result, _ = self.run_stage([], forced=True, failing=("npm audit signatures",))
        self.assertIn("npm audit signatures:", result.detail)

    def test_vulnerable_dotnet_packages_fail(self) -> None:
        output = ["The following sources were used", "Project has the following vulnerable packages"]
        result, _ = self.run_stage(["app/A/A.csproj"], dotnet_out=output)
        self.assertEqual(result.status, "FAIL")
        self.assertEqual(result.detail[0], "dotnet vulnerable packages:")

    def test_failing_dotnet_listing_counts_as_vulnerable(self) -> None:
        result, _ = self.run_stage(["app/A/A.csproj"], failing=("dotnet",))
        self.assertEqual(result.status, "FAIL")


if __name__ == "__main__":
    unittest.main()
