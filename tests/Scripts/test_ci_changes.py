"""ci-changes.py: the path rules and the fall back to every job when the diff is unknown."""

from __future__ import annotations

import subprocess
import unittest
from unittest import mock

from scriptsupport import captured, load_script

changes = load_script("ci-changes.py", "ci_changes")
ALL = set(changes.GROUPS)


class SelectGroupsTests(unittest.TestCase):
    def test_no_files_need_no_job(self) -> None:
        self.assertEqual(changes.select_groups([]), set())

    def test_documentation_and_deployment_need_no_job(self) -> None:
        files = ["CHANGELOG.md", "app/AutoService.WebUI/CLAUDE.md", "docs/guide.txt", "deploy/azure/main.bicep", ".claude/agents/a.md", "tests/Scripts/test_x.py"]
        self.assertEqual(changes.select_groups(files), set())

    def test_webui_change_needs_only_the_webui_group(self) -> None:
        self.assertEqual(changes.select_groups(["app/AutoService.WebUI/src/main.tsx"]), {"webui"})

    def test_backend_change_needs_the_build_and_the_api_suites(self) -> None:
        self.assertEqual(changes.select_groups(["app/AutoService.ApiService/Program.cs"]), {"backend", "api_suites"})

    def test_shared_app_file_counts_as_backend(self) -> None:
        self.assertEqual(changes.select_groups(["app/Directory.Build.props"]), {"backend", "api_suites"})

    def test_unit_tests_and_the_tool_manifest_need_only_the_build(self) -> None:
        self.assertEqual(changes.select_groups(["tests/AutoService.UnitTests/A.cs", "dotnet-tools.json"]), {"backend"})

    def test_suites_and_their_runner_need_only_the_api_suites(self) -> None:
        self.assertEqual(changes.select_groups(["tests/API/a.http", "tests/Database/a.sql", "scripts/httpyac_summary.py"]), {"api_suites"})

    def test_a_path_without_a_rule_needs_every_job(self) -> None:
        for path in (".github/workflows/tests.yml", ".gitattributes", "new-root-file.json", "tests/.env.example"):
            self.assertEqual(changes.select_groups([path]), ALL, path)

    def test_groups_of_several_files_add_up(self) -> None:
        self.assertEqual(changes.select_groups(["README.md", "app/AutoService.WebUI/package.json", "tests/API/a.http"]), {"webui", "api_suites"})


class ChangedFilesTests(unittest.TestCase):
    def test_empty_base_is_unknown_and_runs_no_git(self) -> None:
        with mock.patch.object(changes.subprocess, "run") as run:
            self.assertIsNone(changes.changed_files(""))
        run.assert_not_called()

    def test_git_error_is_unknown(self) -> None:
        failed = subprocess.CompletedProcess([], 128, "", "bad object")
        with mock.patch.object(changes.subprocess, "run", return_value=failed):
            self.assertIsNone(changes.changed_files("deadbeef"))

    def test_diff_lists_both_sides_of_a_rename(self) -> None:
        done = subprocess.CompletedProcess([], 0, "a.txt\nb.txt\n", "")
        with mock.patch.object(changes.subprocess, "run", return_value=done) as run:
            self.assertEqual(changes.changed_files("abc"), ["a.txt", "b.txt"])
        self.assertIn("--no-renames", run.call_args.args[0])


class MainTests(unittest.TestCase):
    def output(self, files: list[str] | None) -> str:
        with mock.patch.object(changes, "changed_files", return_value=files), captured() as (out, _):
            code = changes.main(["--base", "abc"])
        self.assertEqual(code, 0)
        return out.getvalue()

    def test_prints_one_output_line_per_group(self) -> None:
        self.assertEqual(self.output(["app/AutoService.WebUI/a.ts"]).splitlines(), ["webui=true", "backend=false", "api_suites=false"])

    def test_unknown_diff_runs_every_job(self) -> None:
        self.assertEqual(self.output(None).splitlines(), ["webui=true", "backend=true", "api_suites=true"])

    def test_a_clean_diff_runs_no_job(self) -> None:
        self.assertEqual(self.output([]).splitlines(), ["webui=false", "backend=false", "api_suites=false"])


if __name__ == "__main__":
    unittest.main()
