"""httpyac_summary.py: request summary extraction from HTTPYAC output."""

from __future__ import annotations

import json
import unittest

import scriptsupport  # noqa: F401  (puts scripts/ on sys.path)
import httpyac_summary as hs

KEYS = ("totalRequests", "successRequests", "failedRequests", "erroredRequests")


def summary_json(total: int, success: int, failed: int, errored: int, **extra: object) -> str:
    return json.dumps({"summary": {"totalRequests": total, "successRequests": success,
                                   "failedRequests": failed, "erroredRequests": errored}, **extra})


class ExtractHttpSummaryTests(unittest.TestCase):
    def test_clean_json(self) -> None:
        expected = dict(zip(KEYS, (5, 4, 1, 0)))
        self.assertEqual(hs.extract_http_summary(summary_json(5, 4, 1, 0)), expected)

    def test_json_surrounded_by_log_noise(self) -> None:
        output = "starting\n" + summary_json(3, 3, 0, 0) + "\ndone {not json"
        self.assertEqual(hs.extract_http_summary(output)["totalRequests"], 3)

    def test_an_unrelated_json_object_before_the_summary_is_skipped(self) -> None:
        output = '{"progress": 1}\n' + summary_json(7, 7, 0, 0)
        self.assertEqual(hs.extract_http_summary(output)["totalRequests"], 7)

    def test_the_payload_with_the_most_requests_wins_and_ties_go_to_the_later_one(self) -> None:
        lead = '{"progress": 1}\n'
        output = lead + summary_json(2, 2, 0, 0) + "\n" + summary_json(9, 8, 1, 0) + "\n" + summary_json(1, 1, 0, 0)
        self.assertEqual(hs.extract_http_summary(output)["totalRequests"], 9)
        tie = lead + summary_json(4, 4, 0, 0) + "\n" + summary_json(4, 3, 1, 0)
        self.assertEqual(hs.extract_http_summary(tie)["failedRequests"], 1)

    def test_missing_and_null_counters_default_to_zero(self) -> None:
        output = json.dumps({"summary": {"totalRequests": 3, "failedRequests": None}})
        self.assertEqual(hs.extract_http_summary(output), dict(zip(KEYS, (3, 0, 0, 0))))

    def test_numeric_strings_are_converted(self) -> None:
        output = json.dumps({"summary": {"totalRequests": "12"}})
        self.assertEqual(hs.extract_http_summary(output)["totalRequests"], 12)

    def test_broken_json_falls_back_to_the_regex_and_takes_the_last_match(self) -> None:
        output = ('"totalRequests": 1, "successRequests": 1, "failedRequests": 0, "erroredRequests": 0 ... '
                  '{"summary": {"totalRequests": 9, "successRequests": 8, "failedRequests": 1, "erroredRequests": 0')
        self.assertEqual(hs.extract_http_summary(output), dict(zip(KEYS, (9, 8, 1, 0))))

    def test_regex_fallback_needs_all_four_counters(self) -> None:
        output = '{"summary": {"totalRequests": 9, "successRequests": 8, "failedRequests": 1'
        self.assertEqual(hs.extract_http_summary(output), {"parseError": "HTTPYAC JSON output could not be parsed."})

    def test_output_without_json_is_a_parse_error(self) -> None:
        for output in ("", "plain text", "[1, 2, 3]", '{"summary": "none"}', '{"summary": {}}'):
            with self.subTest(output=output):
                self.assertEqual(hs.extract_http_summary(output), {"parseError": "HTTPYAC JSON output could not be parsed."})


class InternalHelperTests(unittest.TestCase):
    def test_total_requests_helper_tolerates_bad_values(self) -> None:
        self.assertEqual(hs._httpyac_total_requests({"summary": {"totalRequests": "abc"}}), 0)
        self.assertEqual(hs._httpyac_total_requests({"summary": {"totalRequests": [1]}}), 0)
        self.assertEqual(hs._httpyac_total_requests({"summary": "x"}), 0)
        self.assertEqual(hs._httpyac_total_requests({"summary": {"totalRequests": 4}}), 4)

    def test_has_summary_needs_a_known_key(self) -> None:
        self.assertTrue(hs._has_httpyac_summary({"summary": {"failedRequests": 0}}))
        self.assertFalse(hs._has_httpyac_summary({"summary": {"other": 1}}))
        self.assertFalse(hs._has_httpyac_summary({"summary": []}))
        self.assertFalse(hs._has_httpyac_summary({}))

    def test_json_payload_scan_returns_the_first_object(self) -> None:
        self.assertEqual(hs._extract_json_payload('x {"a": 1} {"b": 2}'), {"a": 1})
        self.assertIsNone(hs._extract_json_payload("no braces"))
        self.assertIsNone(hs._extract_json_payload("[1]"))

    def test_candidate_iteration_skips_undecodable_braces(self) -> None:
        candidates = list(hs._iter_json_object_candidates('{ nope {"a": 1}'))
        self.assertEqual(candidates, [{"a": 1}])

    def test_best_payload_without_a_summary_is_none(self) -> None:
        self.assertIsNone(hs._select_best_httpyac_payload([{"x": 1}]))


if __name__ == "__main__":
    unittest.main()
