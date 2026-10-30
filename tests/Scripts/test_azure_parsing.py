"""azure_deploy: .env parsing, enum reading from C# files, constants and error types."""

from __future__ import annotations

import re
import unittest

from scriptsupport import ROOT, TempDirCase

from azure_deploy import constants
from azure_deploy.enums import read_enum_names
from azure_deploy.envfile import clean_value, read_env_file
from azure_deploy.errors import ConfigError, StepFailure
from azure_deploy.validators import KEY_CHECKS
from test_suite_secrets import EnvironmentLoader


class EnvFileTests(TempDirCase):
    def read(self, text: str) -> dict[str, str]:
        return read_env_file(self.write(".env", text))

    def test_missing_file_gives_an_empty_mapping(self) -> None:
        self.assertEqual(read_env_file(self.tmp / "absent.env"), {})

    def test_comments_blank_lines_and_lines_without_equals_are_skipped(self) -> None:
        self.assertEqual(self.read("# c\n\n   \nnot a pair\nA=1\n"), {"A": "1"})

    def test_export_prefix_spaces_and_quotes(self) -> None:
        self.assertEqual(self.read("export A = x \nB=\"two words\"\nC='q'\n"), {"A": "x", "B": "two words", "C": "q"})

    def test_values_may_contain_equals_and_hashes(self) -> None:
        self.assertEqual(self.read("U=a=b#c\n"), {"U": "a=b#c"})

    def test_empty_keys_are_skipped_and_empty_values_kept(self) -> None:
        self.assertEqual(self.read("=x\nE=\n"), {"E": ""})

    def test_a_byte_order_mark_does_not_corrupt_the_first_key(self) -> None:
        path = self.tmp / "bom.env"
        path.write_bytes(b"\xef\xbb\xbfFIRST=1\nSECOND=2\n")
        self.assertEqual(read_env_file(path), {"FIRST": "1", "SECOND": "2"})

    def test_later_duplicates_win(self) -> None:
        self.assertEqual(self.read("K=1\nK=2\n"), {"K": "2"})

    def test_clean_value(self) -> None:
        self.assertEqual((clean_value('"a"'), clean_value("'a'"), clean_value("a"), clean_value("'a\"")), ("a", "a", "a", "'a\""))

    def test_same_rules_as_the_test_runner_loader(self) -> None:
        text = "# c\nexport A = 1\nB=\"x y\"\nC=a=b\nD=\n=skip\nnoequals\n"
        path = self.write("shared.env", text)
        loaded: dict[str, str] = {}
        EnvironmentLoader._load_file(path, loaded)
        self.assertEqual(read_env_file(path), loaded)


class EnumTests(TempDirCase):
    def enum(self, body: str, name: str = "Sample") -> list[str]:
        self.write(f"{name}.cs", f"namespace X;\n\n/** doc */\npublic enum {name}\n{{\n{body}\n}}\n")
        return read_enum_names(name, self.tmp)

    def test_members_with_values_trailing_commas_and_comments(self) -> None:
        body = "    A = 1, // first\n    B = 2,\n    C,         // third\n    D          // last, no comma\n"
        self.assertEqual(self.enum(body), ["A", "B", "C", "D"])

    def test_comment_only_and_blank_lines_are_ignored(self) -> None:
        self.assertEqual(self.enum("    // heading\n\n    One,\n    // between\n    Two\n"), ["One", "Two"])

    def test_byte_order_mark_is_accepted(self) -> None:
        (self.tmp / "Bom.cs").write_bytes(b"\xef\xbb\xbfpublic enum Bom\n{\n    X,\n    Y\n}\n")
        self.assertEqual(read_enum_names("Bom", self.tmp), ["X", "Y"])

    def test_missing_source_file(self) -> None:
        with self.assertRaisesRegex(ConfigError, "Enum source Nope.cs not found"):
            read_enum_names("Nope", self.tmp)

    def test_file_without_the_enum(self) -> None:
        self.write("Other.cs", "public class Other { }\n")
        with self.assertRaisesRegex(ConfigError, "Enum Other not found in Other.cs"):
            read_enum_names("Other", self.tmp)

    def test_empty_enum(self) -> None:
        with self.assertRaisesRegex(ConfigError, "has no readable members"):
            self.enum("    // nothing here\n", "Empty")

    def test_the_real_domain_enums_are_readable(self) -> None:
        for name in ("SpecializationType", "ExpertiseType"):
            with self.subTest(name=name):
                members = read_enum_names(name)
                self.assertTrue(members)
                self.assertTrue(all(re.fullmatch(r"[A-Za-z_]\w*", member) for member in members))
                self.assertEqual(len(members), len(set(members)))


class ConstantsTests(unittest.TestCase):
    def test_error_types_map_to_distinct_exit_codes(self) -> None:
        self.assertEqual((constants.EXIT_OK, constants.EXIT_STEP_FAILED, constants.EXIT_BAD_CONFIG), (0, 1, 2))
        self.assertFalse(issubclass(ConfigError, StepFailure) or issubclass(StepFailure, ConfigError))
        self.assertTrue(issubclass(ConfigError, Exception) and issubclass(StepFailure, Exception))

    def test_paths_point_into_the_repository(self) -> None:
        self.assertEqual(constants.ROOT_DIR, ROOT)
        self.assertEqual(constants.ENV_FILE, ROOT / ".env")
        self.assertTrue(constants.UNIQUE_TYPES_DIR.is_dir())

    def test_key_lists_are_consistent(self) -> None:
        required, optional = set(constants.REQUIRED_KEYS), set(constants.OPTIONAL_DEFAULTS) | set(constants.OPTIONAL_UNSET)
        self.assertEqual(len(required), len(constants.REQUIRED_KEYS))
        self.assertFalse(required & optional)
        self.assertTrue(set(constants.SECRET_KEYS) <= required)
        self.assertTrue(set(KEY_CHECKS) <= required | optional, "a KEY_CHECKS entry names an unknown key")
        self.assertTrue(all(key.startswith("ARSM_") for key in required | optional))

    def test_every_default_passes_its_own_check(self) -> None:
        for key, default in constants.OPTIONAL_DEFAULTS.items():
            with self.subTest(key=key):
                check = KEY_CHECKS.get(key)
                self.assertTrue(check is None or check(default) is None)

    def test_resource_names_dockerfiles_and_images_cover_the_same_kinds(self) -> None:
        self.assertEqual(set(constants.RESOURCE_NAMES), {"api", "web", "gate"})
        self.assertEqual(set(constants.DOCKERFILES), set(constants.RESOURCE_NAMES))
        for kind, path in constants.DOCKERFILES.items():
            with self.subTest(kind=kind):
                self.assertTrue((ROOT / path).is_file())

    def test_documented_numbers(self) -> None:
        self.assertEqual(constants.TAG_LENGTH, 12)
        self.assertEqual(constants.REQUIRED_TOOLS, ("az", "docker", "git"))
        self.assertGreater(constants.MIGRATION_TIMEOUT_SECONDS, 900)
        self.assertEqual(constants.MIGRATION_JOB_NAME, "arsm-migrate")
        self.assertNotEqual(constants.MAIN_DEPLOYMENT, constants.PRE_APPS_DEPLOYMENT)


if __name__ == "__main__":
    unittest.main()
