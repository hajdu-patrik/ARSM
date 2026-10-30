"""run-local-test-suite.py: registered checks, targets, arguments and the sanitized report."""

from __future__ import annotations

import json
import unittest

from scriptsupport import ROOT, TempDirCase, captured, load_script

runner = load_script("run-local-test-suite.py", "runner_under_test")


class PythonHttpCheckRegistryTests(unittest.TestCase):
    CHECKS = runner.PYTHON_HTTP_CHECKS

    def test_entries_are_four_non_empty_strings(self) -> None:
        for entry in self.CHECKS:
            with self.subTest(entry=entry[0]):
                self.assertEqual(len(entry), 4)
                self.assertTrue(all(isinstance(part, str) and part.strip() for part in entry))

    def test_report_keys_labels_scripts_and_names_are_unique(self) -> None:
        for column, what in enumerate(("report key", "command label", "script path", "human name")):
            values = [entry[column] for entry in self.CHECKS]
            with self.subTest(column=what):
                self.assertEqual(len(values), len(set(values)))

    def test_every_registered_script_exists(self) -> None:
        for _, _, script, _ in self.CHECKS:
            with self.subTest(script=script):
                self.assertTrue((ROOT / script).is_file())
                self.assertTrue(script.startswith("tests/API/") and script.endswith(".py"))

    def test_every_check_script_in_tests_api_is_registered(self) -> None:
        registered = {script for _, _, script, _ in self.CHECKS}
        found = {path.relative_to(ROOT).as_posix() for path in (ROOT / "tests" / "API").rglob("*-check.py")}
        self.assertEqual(sorted(found - registered), [], "a *-check.py script is not in PYTHON_HTTP_CHECKS")
        self.assertEqual(sorted(registered - found), [])


class TargetTests(unittest.TestCase):
    def test_canonical_order(self) -> None:
        self.assertEqual(runner.TARGET_ORDER, ("playwright", "http", "sql"))

    def test_normalize_defaults_and_all(self) -> None:
        self.assertEqual(runner.normalize_targets([]), ["playwright", "http", "sql"])
        self.assertEqual(runner.normalize_targets(["all"]), ["playwright", "http", "sql"])
        self.assertEqual(runner.normalize_targets(["sql", "all"]), ["playwright", "http", "sql"])

    def test_normalize_keeps_the_given_order_and_drops_duplicates(self) -> None:
        self.assertEqual(runner.normalize_targets(["sql", "http", "sql"]), ["sql", "http"])

    def test_parse_args_default_and_choices(self) -> None:
        self.assertEqual(runner.parse_args([]).targets, ["all"])
        self.assertEqual(runner.parse_args(["http", "sql"]).targets, ["http", "sql"])

    def test_unknown_target_is_a_usage_error(self) -> None:
        with captured(), self.assertRaises(SystemExit) as raised:
            runner.parse_args(["bogus"])
        self.assertEqual(raised.exception.code, 2)


class FakeSanitizer:
    def sanitize(self, text: str) -> str:
        return text


class LocalRunnerHelperTests(unittest.TestCase):
    def make(self) -> object:
        return runner.LocalTestRunner(ROOT, ROOT / "tests" / ".artifacts", {}, FakeSanitizer())

    def test_unknown_target_is_a_failed_result(self) -> None:
        result = self.make()._run_target("bogus")
        self.assertEqual((result.name, result.status, result.return_code), ("bogus", "failed", 1))
        self.assertEqual(result.details, {"error": "Unknown target: bogus"})

    def test_run_targets_collects_one_result_per_target_in_order(self) -> None:
        instance = self.make()
        instance._run_target = lambda target: runner.SuiteResult(target, "passed")
        with captured() as (out, _):
            results = instance.run_targets(["http", "sql"])
        self.assertEqual([item.name for item in results], ["http", "sql"])
        self.assertIn("[PASSED] sql", out.getvalue())

    def test_tail_drops_blank_lines_and_keeps_the_last_40(self) -> None:
        text = "\n".join(["", "  ", *(f"line {index}" for index in range(50))])
        tail = runner.LocalTestRunner._tail(text)
        self.assertEqual((len(tail), tail[0], tail[-1]), (40, "line 10", "line 49"))

    def test_json_payload_extraction(self) -> None:
        extract = runner.LocalTestRunner._extract_json_payload
        self.assertEqual(extract('{"status": "passed"}'), {"status": "passed"})
        self.assertEqual(extract('log {"status": "skipped"} more'), {"status": "skipped"})
        self.assertIsNone(extract("no json"))
        self.assertIsNone(extract("[1, 2]"))

    def test_required_executable(self) -> None:
        with self.assertRaisesRegex(RuntimeError, "Required command not found: definitely-not-a-real-tool"):
            runner.LocalTestRunner._required_executable("definitely-not-a-real-tool")


class WriteReportTests(TempDirCase):
    def test_report_content_and_relative_path(self) -> None:
        results = [runner.SuiteResult("http", "passed"), runner.SuiteResult("sql", "failed", 1, {"failed": 2}, ["tail"])]
        path = runner.write_report(self.tmp, self.tmp / "tests" / ".artifacts", ["http", "sql"], results)
        self.assertEqual(path.as_posix(), "tests/.artifacts/test-suite-summary.json")
        report = json.loads((self.tmp / path).read_text(encoding="utf-8"))
        self.assertEqual((report["schemaVersion"], report["targets"], report["overallStatus"]), (1, ["http", "sql"], "failed"))
        self.assertEqual(report["results"][1], {"name": "sql", "status": "failed", "return_code": 1,
                                                 "details": {"failed": 2}, "output_tail": ["tail"]})
        self.assertTrue(report["aiInstructions"])

    def test_all_passed_gives_an_overall_pass(self) -> None:
        path = runner.write_report(self.tmp, self.tmp / "art", ["sql"], [runner.SuiteResult("sql", "passed")])
        self.assertEqual(json.loads((self.tmp / path).read_text(encoding="utf-8"))["overallStatus"], "passed")


if __name__ == "__main__":
    unittest.main()
