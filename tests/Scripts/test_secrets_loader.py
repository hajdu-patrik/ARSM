"""test_suite_secrets.py EnvironmentLoader: KEY=VALUE parsing, file precedence and secret collection."""

from __future__ import annotations

import unittest

from scriptsupport import TempDirCase

from test_suite_secrets import SENSITIVE_NAME_PATTERN, EnvironmentLoader


class CleanValueTests(unittest.TestCase):
    def test_one_pair_of_matching_quotes_is_stripped(self) -> None:
        self.assertEqual(EnvironmentLoader._clean_value('"abc"'), "abc")
        self.assertEqual(EnvironmentLoader._clean_value("'abc'"), "abc")
        self.assertEqual(EnvironmentLoader._clean_value('""'), "")

    def test_other_values_are_kept(self) -> None:
        for value in ('"abc\'', "'abc", '"', "plain", "", "a\"b\""):
            with self.subTest(value=value):
                self.assertEqual(EnvironmentLoader._clean_value(value), value)

    def test_only_the_outer_pair_is_removed(self) -> None:
        self.assertEqual(EnvironmentLoader._clean_value("\"'x'\""), "'x'")


class LoadFileTests(TempDirCase):
    def load(self, text: str, environment: dict[str, str] | None = None) -> tuple[dict[str, str], list[str]]:
        path = self.write("env.txt", text)
        environment = {} if environment is None else environment
        return environment, EnvironmentLoader._load_file(path, environment)

    def test_missing_file_loads_nothing(self) -> None:
        environment: dict[str, str] = {}
        self.assertEqual(EnvironmentLoader._load_file(self.tmp / "absent", environment), [])
        self.assertEqual(environment, {})

    def test_blank_lines_comments_and_lines_without_equals_are_skipped(self) -> None:
        environment, values = self.load("\n  \n# comment\nnot a pair\nKEY=value\n")
        self.assertEqual((environment, values), ({"KEY": "value"}, ["value"]))

    def test_export_prefix_whitespace_and_quotes(self) -> None:
        environment, _ = self.load("export A = one \n  B=\"two words\"\nC='three'\n")
        self.assertEqual(environment, {"A": "one", "B": "two words", "C": "three"})

    def test_only_the_first_equals_splits(self) -> None:
        environment, _ = self.load("URL=postgres://u:p=q@h/db?x=1\n")
        self.assertEqual(environment["URL"], "postgres://u:p=q@h/db?x=1")

    def test_empty_key_is_skipped_but_empty_value_is_loaded(self) -> None:
        environment, values = self.load("=orphan\nEMPTY=\n")
        self.assertEqual((environment, values), ({"EMPTY": ""}, [""]))

    def test_a_hash_inside_a_value_is_not_a_comment(self) -> None:
        self.assertEqual(self.load("KEY=ab#cd\n")[0], {"KEY": "ab#cd"})

    def test_a_byte_order_mark_does_not_corrupt_the_first_key(self) -> None:
        path = self.tmp / "bom.env"
        path.write_bytes(b"\xef\xbb\xbfFIRST=1\nSECOND=2\n")
        environment: dict[str, str] = {}
        EnvironmentLoader._load_file(path, environment)
        self.assertEqual(environment, {"FIRST": "1", "SECOND": "2"})

    def test_later_lines_overwrite_earlier_ones(self) -> None:
        self.assertEqual(self.load("K=1\nK=2\n")[0], {"K": "2"})

    def test_existing_environment_entries_are_overwritten_by_the_file(self) -> None:
        environment, _ = self.load("K=file\n", {"K": "process", "OTHER": "keep"})
        self.assertEqual(environment, {"K": "file", "OTHER": "keep"})


class LoadTests(TempDirCase):
    def test_both_files_are_read_and_the_second_wins(self) -> None:
        self.write(".secrets", "SHARED=from-secrets\nONLY_SECRETS=a\n")
        self.write("tests/.env", "SHARED=from-tests-env\nONLY_TESTS=b\n")
        environment: dict[str, str] = {}
        EnvironmentLoader(self.tmp).load(environment)
        self.assertEqual(environment, {"SHARED": "from-tests-env", "ONLY_SECRETS": "a", "ONLY_TESTS": "b"})

    def test_missing_files_leave_the_environment_untouched(self) -> None:
        environment = {"KEEP": "1"}
        self.assertEqual(EnvironmentLoader(self.tmp).load(environment), [])
        self.assertEqual(environment, {"KEEP": "1"})

    def test_returned_values_are_every_loaded_value_plus_sensitive_environment_values(self) -> None:
        self.write(".secrets", "PLAIN_NAME=plain-value\nADMIN_PASSWORD=pw-from-file\n")
        environment = {"INHERITED_API_KEY": "inherited-key", "HARMLESS": "visible"}
        values = EnvironmentLoader(self.tmp).load(environment)
        self.assertIn("plain-value", values)
        self.assertIn("pw-from-file", values)
        self.assertIn("inherited-key", values)
        self.assertNotIn("visible", values)

    def test_sensitive_names_cover_the_documented_words(self) -> None:
        for name in ("DB_PASSWORD", "PGPASSWORD", "api_token", "SESSION_COOKIE", "SECRET", "SOME_KEY", "CONNECTION_STRING", "passwd"):
            with self.subTest(name=name):
                self.assertIsNotNone(SENSITIVE_NAME_PATTERN.search(name))
        for name in ("ARSM_TEST_ADMIN_EMAIL", "PORT", "PATH"):
            with self.subTest(name=name):
                self.assertIsNone(SENSITIVE_NAME_PATTERN.search(name))


if __name__ == "__main__":
    unittest.main()
