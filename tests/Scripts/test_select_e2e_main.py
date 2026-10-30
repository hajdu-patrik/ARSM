"""select-e2e-specs.py: git diff reading, command line and the FEATURE_SPECS mapping against the real suite."""

from __future__ import annotations

import os
import subprocess
import sys
import unittest
from unittest import mock

from scriptsupport import ROOT, WEBUI, TempDirCase, captured, load_script

select = load_script("select-e2e-specs.py", "select_e2e_specs")
PREFIX = select.WEBUI_PREFIX


def completed(returncode: int = 0, stdout: str = "") -> subprocess.CompletedProcess[str]:
    return subprocess.CompletedProcess([], returncode, stdout, "")


class ChangedWebuiFilesTests(unittest.TestCase):
    def test_merges_diff_and_untracked_files_relative_to_the_webui(self) -> None:
        outputs = iter([
            completed(stdout=f"{PREFIX}src/a.ts\nREADME.md\n{PREFIX}src/b.ts\n"),
            completed(stdout=f"{PREFIX}src/a.ts\n{PREFIX}tests/e2e/c.spec.ts\n"),
        ])
        with mock.patch.object(select.subprocess, "run", side_effect=lambda *a, **k: next(outputs)) as run:
            files = select.changed_webui_files("origin/main")
        self.assertEqual(files, ["src/a.ts", "src/b.ts", "tests/e2e/c.spec.ts"])
        self.assertEqual(run.call_args_list[0].args[0], ["git", "diff", "--name-only", "origin/main"])
        self.assertEqual(run.call_args_list[1].args[0], ["git", "ls-files", "--others", "--exclude-standard"])

    def test_git_failure_raises(self) -> None:
        with mock.patch.object(select.subprocess, "run", return_value=completed(128)):
            with self.assertRaisesRegex(RuntimeError, "git diff --name-only HEAD failed"):
                select.changed_webui_files("HEAD")


class MainTests(TempDirCase):
    def run_main(self, files: list[str], *argv: str, returncode: int = 0):
        with mock.patch.object(select, "changed_webui_files", return_value=files), \
                mock.patch.object(select, "E2E_DIR", self.tmp), \
                mock.patch.object(select.subprocess, "run", return_value=completed(returncode)) as run, \
                captured() as (out, err):
            code = select.main(list(argv))
        return code, out.getvalue(), err.getvalue(), run

    def test_git_error_exits_2(self) -> None:
        with mock.patch.object(select, "changed_webui_files", side_effect=RuntimeError("git diff failed")), captured() as (_, err):
            code = select.main([])
        self.assertEqual(code, 2)
        self.assertIn("select-e2e-specs: git diff failed", err.getvalue())

    def test_prints_the_sorted_selection(self) -> None:
        code, out, _, run = self.run_main(["src/pages/Settings/Page.tsx"])
        self.assertEqual(code, 0)
        names = ("accessibility", "settings-account", "settings-company", "settings-edge", "settings-password", "settings-picture", "settings-profile")
        self.assertEqual(out.split(), [f"tests/e2e/{name}.spec.ts" for name in names])
        run.assert_not_called()

    def test_prints_ALL_for_a_shared_file(self) -> None:
        self.assertEqual(self.run_main(["package.json"])[1].strip(), "ALL")

    def test_no_change_prints_an_empty_selection(self) -> None:
        code, out, _, _ = self.run_main([])
        self.assertEqual((code, out.strip()), (0, ""))

    def test_base_ref_is_forwarded(self) -> None:
        with mock.patch.object(select, "changed_webui_files", return_value=[]) as changed, captured():
            select.main(["--base", "origin/main"])
        changed.assert_called_once_with("origin/main")

    def test_run_without_a_webui_change_runs_nothing(self) -> None:
        code, out, _, run = self.run_main([], "--run")
        self.assertEqual(code, 0)
        self.assertIn("no WebUI change", out)
        run.assert_not_called()

    def test_run_passes_the_selected_specs_to_the_runner_through_the_environment(self) -> None:
        self.write("login-edge.spec.ts", "")
        code, _, _, run = self.run_main(["tests/e2e/login-edge.spec.ts"], "--run", returncode=3)
        self.assertEqual(code, 3)
        command = run.call_args.args[0]
        self.assertEqual(command[:1], [sys.executable])
        self.assertTrue(command[1].endswith("run-local-test-suite.py"))
        self.assertEqual(command[2:], ["playwright"])
        self.assertEqual(run.call_args.kwargs["env"]["ARSM_E2E_SPECS"], "tests/e2e/login-edge.spec.ts")
        self.assertEqual(run.call_args.kwargs["cwd"], select.ROOT)

    def test_run_for_the_full_suite_sets_an_empty_spec_list(self) -> None:
        with mock.patch.dict(os.environ, {"ARSM_E2E_SPECS": "stale.spec.ts"}):
            _, _, _, run = self.run_main(["package.json"], "--run")
        self.assertEqual(run.call_args.kwargs["env"]["ARSM_E2E_SPECS"], "")

    def test_a_deleted_spec_is_not_selected(self) -> None:
        self.write("alive.spec.ts", "")
        _, out, _, _ = self.run_main(["tests/e2e/alive.spec.ts", "tests/e2e/gone.spec.ts"])
        self.assertEqual(out.split(), ["tests/e2e/alive.spec.ts"])

    def test_a_diff_with_only_a_deleted_spec_runs_nothing(self) -> None:
        code, _, _, run = self.run_main(["tests/e2e/gone.spec.ts"], "--run")
        self.assertEqual(code, 0)
        run.assert_not_called()


class FeatureMappingTests(unittest.TestCase):
    def test_every_mapped_spec_exists_as_a_file(self) -> None:
        names = {select.AXE_SWEEP_SPEC}
        for specs in select.FEATURE_SPECS.values():
            names.update(specs)
        missing = sorted(name for name in names if not (WEBUI / "tests" / "e2e" / f"{name}.spec.ts").is_file())
        self.assertEqual(missing, [], "FEATURE_SPECS names a spec that does not exist")

    def test_e2e_dir_points_at_the_real_suite(self) -> None:
        self.assertEqual(select.E2E_DIR, WEBUI / "tests" / "e2e")
        self.assertTrue(select.E2E_DIR.is_dir())

    def test_every_rule_prefix_points_at_existing_webui_paths(self) -> None:
        for prefix in select.FEATURE_SPECS:
            target = WEBUI / prefix
            with self.subTest(prefix=prefix):
                if prefix.endswith("/"):
                    self.assertTrue(target.is_dir())
                else:
                    self.assertTrue(any(target.parent.glob(target.name + "*")))

    def test_rule_specs_are_unique_per_rule(self) -> None:
        for prefix, specs in select.FEATURE_SPECS.items():
            with self.subTest(prefix=prefix):
                self.assertEqual(len(specs), len(set(specs)))

    def test_repo_root_constant(self) -> None:
        self.assertEqual(select.ROOT, ROOT)


if __name__ == "__main__":
    unittest.main()
