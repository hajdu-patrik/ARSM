"""run-local-test-suite.py: the HTTP and Playwright suite drivers with a recording command runner."""

from __future__ import annotations

import json
import sys

from scriptsupport import TempDirCase, load_script
from test_runner_commands import RecordingRunner

runner = load_script("run-local-test-suite.py", "runner_under_test")

CLEAN_SUMMARY = json.dumps({"summary": {"totalRequests": 4, "successRequests": 4, "failedRequests": 0, "erroredRequests": 0},
                            "requests": []})
FAILING_SUMMARY = json.dumps({
    "summary": {"totalRequests": 4, "successRequests": 3, "failedRequests": 1, "erroredRequests": 0},
    "requests": [{"fileName": "tests/API/x.http", "line": 5, "title": "T", "response": {"statusCode": 500},
                  "testResults": [{"status": "FAILED", "message": "expected 200"}]}],
})
CHECK_NAMES = [entry[1] for entry in runner.PYTHON_HTTP_CHECKS]


def done(name: str, code: int = 0, out: str = "") -> object:
    return runner.CommandResult(name, code, out, "")


class HttpSuiteTests(TempDirCase):
    def run_http(self, **overrides: object):
        answers = {"http-setup": done("http-setup"), "http": done("http", 0, CLEAN_SUMMARY)}
        answers.update({name: done(name, 0, '{"status": "passed"}') for name in CHECK_NAMES})
        answers.update(overrides)
        instance = runner.LocalTestRunner(self.tmp, self.tmp / "art", {"KEEP": "1"}, runner.OutputSanitizer(self.tmp, []))
        instance.command_runner = RecordingRunner(lambda name, command, input_text: answers[name])
        instance._required_executable = lambda name: name
        return instance._run_http(), instance.command_runner.calls

    def test_clean_run_passes_and_reports_the_summary_setup_and_every_check(self) -> None:
        result, _ = self.run_http()
        self.assertEqual((result.name, result.status, result.return_code), ("http", "passed", 0))
        self.assertEqual(result.details["totalRequests"], 4)
        self.assertIs(result.details["setupPassed"], True)
        self.assertNotIn("failedHttpRequests", result.details)
        for key, *_ in runner.PYTHON_HTTP_CHECKS:
            self.assertEqual(result.details[key], {"status": "passed"})

    def test_commands_run_in_order_setup_checks_suite(self) -> None:
        _, calls = self.run_http()
        self.assertEqual([call[0] for call in calls], ["http-setup", *CHECK_NAMES, "http"])
        setup, suite = calls[0], calls[-1]
        self.assertIn("tests/API/_setup/*.http", setup[1])
        self.assertIn("tests/API/**/*.http", suite[1])
        self.assertIn("--filter", suite[1])
        self.assertEqual(setup[3]["NODE_TLS_REJECT_UNAUTHORIZED"], "0")
        self.assertEqual(setup[3]["KEEP"], "1")

    def test_python_checks_run_with_the_current_interpreter_and_their_script(self) -> None:
        _, calls = self.run_http()
        for (_, _, script, _), call in zip(runner.PYTHON_HTTP_CHECKS, calls[1:-1]):
            self.assertEqual(call[1], [sys.executable, script])

    def test_failed_requests_fail_the_suite_and_are_listed(self) -> None:
        result, _ = self.run_http(http=done("http", 1, FAILING_SUMMARY))
        self.assertEqual((result.status, result.return_code), ("failed", 1))
        self.assertEqual(result.details["failedHttpRequests"][0]["file"], "tests/API/x.http")

    def test_a_failing_httpyac_exit_code_alone_fails_the_suite(self) -> None:
        self.assertEqual(self.run_http(http=done("http", 1, CLEAN_SUMMARY))[0].status, "failed")

    def test_errored_requests_fail_the_suite(self) -> None:
        summary = json.dumps({"summary": {"totalRequests": 2, "successRequests": 1, "failedRequests": 0, "erroredRequests": 1}})
        self.assertEqual(self.run_http(http=done("http", 0, summary))[0].status, "failed")

    def test_a_failed_setup_fails_the_suite_and_is_reported(self) -> None:
        result, _ = self.run_http(**{"http-setup": done("http-setup", 1)})
        self.assertEqual(result.status, "failed")
        self.assertIs(result.details["setupPassed"], False)

    def test_unparseable_httpyac_output_is_recorded_as_a_parse_error(self) -> None:
        result, _ = self.run_http(http=done("http", 0, "garbage"))
        self.assertIn("parseError", result.details)

    def test_a_check_without_json_output_fails_with_its_label(self) -> None:
        name, label = runner.PYTHON_HTTP_CHECKS[0][1], runner.PYTHON_HTTP_CHECKS[0][3]
        result, _ = self.run_http(**{name: done(name, 0, "no json")})
        self.assertEqual(result.status, "failed")
        self.assertEqual(result.details[runner.PYTHON_HTTP_CHECKS[0][0]],
                         {"status": "failed", "error": f"{label} did not return JSON output."})

    def test_a_skipped_check_does_not_fail_the_suite(self) -> None:
        name = CHECK_NAMES[1]
        self.assertEqual(self.run_http(**{name: done(name, 0, '{"status": "skipped"}')})[0].status, "passed")

    def test_a_check_with_a_bad_exit_code_or_status_fails_the_suite(self) -> None:
        name = CHECK_NAMES[2]
        for outcome in (done(name, 1, '{"status": "passed"}'), done(name, 0, '{"status": "failed"}'), done(name, 0, "{}")):
            with self.subTest(code=outcome.return_code, out=outcome.stdout):
                self.assertEqual(self.run_http(**{name: outcome})[0].status, "failed")


class PlaywrightSuiteTests(TempDirCase):
    def run_playwright(self, environment: dict[str, str], code: int = 0):
        instance = runner.LocalTestRunner(self.tmp, self.tmp / "art", environment, runner.OutputSanitizer(self.tmp, []))
        instance.command_runner = RecordingRunner(lambda name, command, input_text: done(name, code, "line\n"))
        instance._required_executable = lambda name: name
        return instance._run_playwright(), instance.command_runner.calls[0]

    def test_full_suite_command_and_defaults(self) -> None:
        result, (name, command, cwd, env, _) = self.run_playwright({})
        self.assertEqual((name, command), ("playwright", ["npm", "run", "e2e"]))
        self.assertEqual(cwd, self.tmp / "app" / "AutoService.WebUI")
        self.assertEqual((env["PORT"], env["PLAYWRIGHT_WORKERS"]), ("5173", "3"))
        self.assertEqual((result.status, result.output_tail), ("passed", ["line"]))

    def test_selected_specs_are_appended_after_a_separator(self) -> None:
        _, (_, command, _, _, _) = self.run_playwright({"ARSM_E2E_SPECS": "tests/e2e/a.spec.ts  tests/e2e/b.spec.ts"})
        self.assertEqual(command, ["npm", "run", "e2e", "--", "tests/e2e/a.spec.ts", "tests/e2e/b.spec.ts"])

    def test_an_empty_spec_selection_runs_everything(self) -> None:
        self.assertEqual(self.run_playwright({"ARSM_E2E_SPECS": "   "})[1][1], ["npm", "run", "e2e"])

    def test_port_and_workers_can_be_overridden(self) -> None:
        _, (_, _, _, env, _) = self.run_playwright({"PORT": "4000", "PLAYWRIGHT_WORKERS": "1"})
        self.assertEqual((env["PORT"], env["PLAYWRIGHT_WORKERS"]), ("4000", "1"))

    def test_a_failing_exit_code_fails_the_suite(self) -> None:
        result, _ = self.run_playwright({}, code=1)
        self.assertEqual((result.status, result.return_code), ("failed", 1))


if __name__ == "__main__":
    import unittest

    unittest.main()
