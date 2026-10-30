"""scripts/prepush: summary table and failed-suite details."""

from __future__ import annotations

import json
from types import SimpleNamespace
from unittest import mock

from scriptsupport import TempDirCase

from prepush import report
from prepush.steps import StageOutcome, StepOutcome

ALL_STAGES = ("validate", "backend", "frontend", "e2e", "api-suites")


def outcome(name: str, *steps: tuple[str, str, float]) -> StageOutcome:
    return StageOutcome(name, [StepOutcome(*step) for step in steps])


def rows_of(text: str) -> list[list[str]]:
    table = [line for line in text.splitlines() if " | " in line]
    return [[cell.strip() for cell in line.split(" | ")] for line in table]


class RenderSummaryTests(TempDirCase):
    def test_header_separator_and_a_passing_run(self) -> None:
        outcomes = [outcome("validate", ("validate.py", "PASS", 2.0)), outcome("backend", ("build", "PASS", 3.0), ("test", "PASS", 1.0))]
        text = report.render_summary(["validate", "backend"], outcomes)
        lines = text.splitlines()
        self.assertEqual(lines[:2], ["", "Pre-push summary"])
        self.assertEqual(lines[2].split(), ["Stage", "|", "Step", "|", "Result", "|", "Time"])
        self.assertEqual(set(lines[3]), {"-", "+"})
        self.assertEqual(lines[-1], "Total 6.0s - pre-push gate PASSED")

    def test_stage_name_is_shown_on_its_first_step_only(self) -> None:
        text = report.render_summary(["backend"], [outcome("backend", ("build", "PASS", 3.0), ("test", "PASS", 1.0))])
        rows = {row[1]: row for row in rows_of(text)}
        self.assertEqual(rows["build"], ["backend", "build", "PASS", "3.0s"])
        self.assertEqual(rows["test"], ["", "test", "PASS", "1.0s"])

    def test_unselected_and_unreached_stages_are_skipped_with_a_reason(self) -> None:
        text = report.render_summary(["validate", "backend"], [outcome("validate", ("v", "FAIL", 1.0))])
        rows = {row[0]: row for row in rows_of(text) if row[0] in ALL_STAGES}
        self.assertEqual(rows["backend"], ["backend", "not reached", "SKIP", "-"])
        self.assertEqual(rows["frontend"], ["frontend", "not selected", "SKIP", "-"])
        self.assertEqual(rows["api-suites"][1:], ["not selected", "SKIP", "-"])

    def test_a_failed_step_fails_the_gate(self) -> None:
        text = report.render_summary(["validate"], [outcome("validate", ("v", "FAIL", 1.0))])
        self.assertTrue(text.endswith("pre-push gate FAILED"))

    def test_stopping_before_a_selected_stage_fails_the_gate_even_if_what_ran_passed(self) -> None:
        text = report.render_summary(["validate", "backend"], [outcome("validate", ("v", "PASS", 1.0))])
        self.assertTrue(text.endswith("pre-push gate FAILED"))

    def test_every_stage_has_a_row(self) -> None:
        text = report.render_summary([], [])
        self.assertEqual([row[0] for row in rows_of(text)][1:], list(ALL_STAGES))


class PrintFailedSuitesTests(TempDirCase):
    def setUp(self) -> None:
        super().setUp()
        patcher = mock.patch.object(report, "ARTIFACTS", self.tmp)
        patcher.start()
        self.addCleanup(patcher.stop)
        self.ctx = SimpleNamespace(lines=[], say=lambda text: self.ctx.lines.append(text))

    def write_report(self, content: object) -> None:
        self.write("test-suite-summary.json", content if isinstance(content, str) else json.dumps(content))

    def test_missing_unreadable_or_incomplete_reports_print_nothing(self) -> None:
        report.print_failed_suites(self.ctx)
        for content in ("{not json", json.dumps({"other": 1})):
            self.write_report(content)
            report.print_failed_suites(self.ctx)
        self.assertEqual(self.ctx.lines, [])

    def test_passed_suites_are_not_listed(self) -> None:
        self.write_report({"results": [{"name": "sql", "status": "passed"}]})
        report.print_failed_suites(self.ctx)
        self.assertEqual(self.ctx.lines, [])

    def test_failed_suite_lists_requests_and_the_output_tail(self) -> None:
        failures = [{"file": f"tests/API/f{index}.http", "line": index, "title": "T", "actualStatus": 500} for index in range(12)]
        suite = {"name": "http", "status": "failed", "details": {"failedHttpRequests": failures},
                 "output_tail": [f"tail {index}" for index in range(30)]}
        self.write_report({"results": [{"name": "sql", "status": "passed"}, suite]})
        report.print_failed_suites(self.ctx)
        lines = self.ctx.lines
        self.assertEqual(lines[0], "       suite http: failed")
        self.assertEqual(lines[1], "         tests/API/f0.http:0 T -> 500")
        self.assertEqual(len([line for line in lines if ".http:" in line]), 10)
        tail = [line for line in lines if "tail " in line]
        self.assertEqual((len(tail), tail[0], tail[-1]), (20, "         tail 10", "         tail 29"))

    def test_a_failed_suite_without_details_still_prints_its_name(self) -> None:
        self.write_report({"results": [{"name": "playwright", "status": "failed"}]})
        report.print_failed_suites(self.ctx)
        self.assertEqual(self.ctx.lines, ["       suite playwright: failed"])


if __name__ == "__main__":
    import unittest

    unittest.main()
