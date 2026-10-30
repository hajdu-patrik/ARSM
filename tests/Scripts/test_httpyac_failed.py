"""httpyac_summary.py: failed-request extraction, JSON path and regex fallback."""

from __future__ import annotations

import json
import unittest

import scriptsupport  # noqa: F401  (puts scripts/ on sys.path)
import httpyac_summary as hs


def payload(requests: object) -> str:
    return json.dumps({"summary": {"totalRequests": 1, "failedRequests": 1}, "requests": requests})


def request(file_name: str = "tests/API/a.http", line: int = 10, status: str = "FAILED", **extra: object) -> dict:
    base = {"fileName": file_name, "line": line, "title": "Create thing", "response": {"statusCode": 500},
            "testResults": [{"status": status, "message": "expected status 200"}]}
    return {**base, **extra}


class JsonPathTests(unittest.TestCase):
    def test_failed_request_is_reduced_to_file_line_title_status_and_messages(self) -> None:
        failed = hs.extract_failed_http_requests(payload([request()]))
        self.assertEqual(failed, [{"file": "tests/API/a.http", "line": 10, "title": "Create thing",
                                   "actualStatus": 500, "failedTests": ["expected status 200"]}])

    def test_error_status_counts_and_passed_tests_do_not(self) -> None:
        requests = [request(status="ERROR"), request(line=20, status="PASSED"), request(line=30, testResults=[])]
        self.assertEqual([item["line"] for item in hs.extract_failed_http_requests(payload(requests))], [10])

    def test_only_broken_tests_of_a_request_are_listed(self) -> None:
        results = [{"status": "PASSED", "message": "fine"}, {"status": "FAILED", "message": "bad"}]
        failed = hs.extract_failed_http_requests(payload([request(testResults=results)]))
        self.assertEqual(failed[0]["failedTests"], ["bad"])

    def test_windows_separators_are_normalised(self) -> None:
        failed = hs.extract_failed_http_requests(payload([request(file_name="tests\\API\\a.http")]))
        self.assertEqual(failed[0]["file"], "tests/API/a.http")

    def test_title_falls_back_to_the_request_name(self) -> None:
        failed = hs.extract_failed_http_requests(payload([request(title="", name="Named")]))
        self.assertEqual(failed[0]["title"], "Named")

    def test_missing_response_gives_no_status(self) -> None:
        item = request()
        del item["response"]
        self.assertIsNone(hs.extract_failed_http_requests(payload([item]))[0]["actualStatus"])

    def test_long_messages_are_cut_to_200_characters(self) -> None:
        results = [{"status": "FAILED", "message": "x" * 500}]
        failed = hs.extract_failed_http_requests(payload([request(testResults=results)]))
        self.assertEqual(len(failed[0]["failedTests"][0]), 200)

    def test_malformed_entries_are_skipped(self) -> None:
        requests = ["text", 5, request(testResults="not a list"), {"fileName": "x"}, request(line=99)]
        failed = hs.extract_failed_http_requests(payload(requests))
        self.assertEqual([item["line"] for item in failed], [99])

    def test_limit_caps_the_list(self) -> None:
        requests = [request(line=line) for line in range(1, 6)]
        self.assertEqual(len(hs.extract_failed_http_requests(payload(requests), limit=2)), 2)

    def test_no_failures_gives_an_empty_list(self) -> None:
        self.assertEqual(hs.extract_failed_http_requests(payload([request(status="PASSED")])), [])

    def test_bodies_and_headers_never_reach_the_result(self) -> None:
        item = request(response={"statusCode": 400, "body": "secret-body", "headers": {"set-cookie": "a=b"}})
        self.assertNotIn("secret-body", json.dumps(hs.extract_failed_http_requests(payload([item]))))


class RegexFallbackTests(unittest.TestCase):
    BROKEN = (
        '{"requests": [{"fileName": "tests/API/a.http", "line": 12, "title": ' + json.dumps('Create "x"') + ', '
        '"response": {"statusCode": 500}, "testResults": [{"message": "expected 200", "status": "FAILED"}]}, '
        '{"fileName": "tests/API/b.http", "line": 3, "title": null, "testResults": [{"message": "m2", "status": "ERROR"}]}, '
        '{"fileName": "tests/API/c.http", "noLine": 1}, {"fileName": "tests/API/d.http", "line": 8, "title": "D", '
        '"testResults": [{"message": "m4", "status": "FAILED"}'
    )

    def test_broken_json_is_read_segment_by_segment(self) -> None:
        failed = hs.extract_failed_http_requests(self.BROKEN)
        self.assertEqual([item["file"] for item in failed], ["tests/API/a.http", "tests/API/b.http", "tests/API/d.http"])
        self.assertEqual(failed[0], {"file": "tests/API/a.http", "line": 12, "title": 'Create "x"', "actualStatus": 500,
                                     "failedTests": ["expected 200"]})

    def test_a_segment_never_borrows_fields_from_its_neighbour(self) -> None:
        second = hs.extract_failed_http_requests(self.BROKEN)[1]
        self.assertEqual((second["title"], second["actualStatus"], second["failedTests"]), (None, None, ["m2"]))

    def test_segments_without_line_and_title_are_skipped(self) -> None:
        self.assertNotIn("tests/API/c.http", [item["file"] for item in hs.extract_failed_http_requests(self.BROKEN)])

    def test_limit_applies_to_the_fallback_too(self) -> None:
        self.assertEqual(len(hs.extract_failed_http_requests(self.BROKEN, limit=2)), 2)

    def test_at_most_five_messages_of_200_characters_per_request(self) -> None:
        tests = ", ".join(f'{{"message": "{"m" * 300}", "status": "FAILED"}}' for _ in range(7))
        raw = f'{{"requests": [{{"fileName": "f.http", "line": 1, "title": "T", "testResults": [{tests}'
        messages = hs.extract_failed_http_requests(raw)[0]["failedTests"]
        self.assertEqual((len(messages), len(messages[0])), (5, 200))

    def test_text_without_requests_gives_an_empty_list(self) -> None:
        self.assertEqual(hs.extract_failed_http_requests("nothing here"), [])
        self.assertEqual(hs.extract_failed_http_requests(""), [])

    def test_valid_json_without_a_requests_list_uses_the_fallback(self) -> None:
        output = json.dumps({"summary": {"totalRequests": 0}, "requests": "oops"})
        self.assertEqual(hs.extract_failed_http_requests(output), [])


if __name__ == "__main__":
    unittest.main()
