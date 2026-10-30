"""validate.py command line: argument defaults, exit codes 0/1/2 and the JSON report."""

from __future__ import annotations

import json
import unittest
from unittest import mock

from scriptsupport import TempDirCase, captured

import validate


def result(name: str, status: str, detail: list[str] | None = None) -> validate.StageResult:
    return validate.StageResult(name, status, detail or [])


class ParseArgsTests(unittest.TestCase):
    def test_defaults(self) -> None:
        args = validate.parse_args([])
        self.assertEqual((args.all, args.base, args.security, args.skip_build, args.json), (False, "HEAD", False, False, False))

    def test_flags(self) -> None:
        args = validate.parse_args(["--all", "--base", "origin/main", "--security", "--skip-build", "--json"])
        self.assertEqual((args.all, args.base, args.security, args.skip_build, args.json), (True, "origin/main", True, True, True))

    def test_unknown_flag_exits_with_usage_error(self) -> None:
        with captured(), self.assertRaises(SystemExit) as raised:
            validate.parse_args(["--nope"])
        self.assertEqual(raised.exception.code, 2)


class MainTests(TempDirCase):
    def setUp(self) -> None:
        super().setUp()
        self.report = self.tmp / "out" / "validate-summary.json"
        self.patches = {
            "REPORT": mock.patch.object(validate, "REPORT", self.report),
            "changed": mock.patch.object(validate, "changed_files", return_value=["a.ts", "b.cs"]),
            "all": mock.patch.object(validate, "all_files", return_value=["x", "y", "z"]),
            "size": mock.patch.object(validate, "stage_size", return_value=result("size", "PASS")),
            "shadows": mock.patch.object(validate, "stage_shadows", return_value=result("shadows", "PASS")),
            "frontend": mock.patch.object(validate, "stage_frontend", return_value=result("frontend", "SKIP")),
            "backend": mock.patch.object(validate, "stage_backend", return_value=result("backend", "SKIP")),
            "security": mock.patch.object(validate, "stage_security", return_value=result("security", "SKIP")),
        }
        self.mocks = {name: patcher.start() for name, patcher in self.patches.items()}
        for patcher in self.patches.values():
            self.addCleanup(patcher.stop)

    def run_main(self, *argv: str) -> tuple[int, str, str]:
        with captured() as (out, err):
            code = validate.main(list(argv))
        return code, out.getvalue(), err.getvalue()

    def test_all_stages_passing_exits_0_and_writes_the_report(self) -> None:
        code, out, _ = self.run_main()
        self.assertEqual(code, 0)
        summary = json.loads(self.report.read_text(encoding="utf-8"))
        self.assertEqual((summary["scope"], summary["files"], summary["passed"]), ("diff:HEAD", 2, True))
        self.assertEqual([stage["name"] for stage in summary["stages"]], ["size", "shadows", "frontend", "backend", "security"])
        self.assertIn("validate: diff:HEAD, 2 file(s)", out)

    def test_skipped_stages_do_not_fail_the_run(self) -> None:
        self.assertEqual(self.run_main()[0], 0)

    def test_a_failing_stage_exits_1_and_prints_its_detail(self) -> None:
        self.mocks["size"].return_value = result("size", "FAIL", ["app/Big.ts: 501 lines > 500"])
        code, out, _ = self.run_main()
        self.assertEqual(code, 1)
        self.assertIn("  FAIL  size", out)
        self.assertIn("        app/Big.ts: 501 lines > 500", out)
        self.assertFalse(json.loads(self.report.read_text(encoding="utf-8"))["passed"])

    def test_git_error_exits_2_without_a_report(self) -> None:
        self.mocks["changed"].side_effect = RuntimeError("git diff --name-only HEAD failed")
        code, _, err = self.run_main()
        self.assertEqual(code, 2)
        self.assertIn("validate: git diff --name-only HEAD failed", err)
        self.assertFalse(self.report.exists())

    def test_diff_scope_uses_the_base_ref(self) -> None:
        self.run_main("--base", "origin/main")
        self.mocks["changed"].assert_called_once_with("origin/main")
        self.assertEqual(json.loads(self.report.read_text(encoding="utf-8"))["scope"], "diff:origin/main")

    def test_all_scope_checks_every_file_and_never_forces_security_from_the_file_list(self) -> None:
        self.run_main("--all", "--skip-build")
        self.mocks["changed"].assert_not_called()
        self.mocks["frontend"].assert_called_once_with(["x", "y", "z"], True, True)
        self.mocks["backend"].assert_called_once_with(["x", "y", "z"], True)
        self.mocks["security"].assert_called_once_with([], False)

    def test_security_flag_is_passed_through(self) -> None:
        self.run_main("--security")
        self.mocks["security"].assert_called_once_with(["a.ts", "b.cs"], True)

    def test_json_flag_prints_the_summary_instead_of_the_table(self) -> None:
        code, out, _ = self.run_main("--json")
        self.assertEqual(code, 0)
        printed = json.loads(out)
        self.assertEqual(printed, json.loads(self.report.read_text(encoding="utf-8")))
        self.assertNotIn("PASS  size", out)

    def test_report_directory_is_created(self) -> None:
        self.assertFalse(self.report.parent.exists())
        self.run_main()
        self.assertTrue(self.report.is_file())


if __name__ == "__main__":
    unittest.main()
