"""azure_deploy.validators: the per-key rules of the production .env."""

from __future__ import annotations

import unittest
import uuid
from unittest import mock

import scriptsupport  # noqa: F401  (puts scripts/ on sys.path)
from azure_deploy import validators as v


class CheckCase(unittest.TestCase):
    def accepts(self, check, *values: str) -> None:  # noqa: ANN001
        for value in values:
            with self.subTest(accepted=value):
                self.assertIsNone(check(value))

    def rejects(self, check, *values: str) -> None:  # noqa: ANN001
        for value in values:
            with self.subTest(rejected=value):
                self.assertIsInstance(check(value), str)


class AzureNameTests(CheckCase):
    def test_subscription_guid(self) -> None:
        self.accepts(v.check_subscription, str(uuid.uuid4()), str(uuid.uuid4()).upper())
        self.rejects(v.check_subscription, "not-a-guid", str(uuid.uuid4()) + "0", uuid.uuid4().hex)

    def test_resource_group(self) -> None:
        self.accepts(v.check_resource_group, "rg-arsm", "rg_1.(x)-y", "a" * 90)
        self.rejects(v.check_resource_group, "a" * 91, "ends.with.dot.", "has space", "slash/inside")

    def test_registry_name(self) -> None:
        self.accepts(v.check_acr_name, "arsmh", "a" * 50, "arsm42x")
        self.rejects(v.check_acr_name, "abcd", "a" * 51, "Upper1234", "with-dash", "under_score")

    def test_location(self) -> None:
        self.accepts(v.check_location, "swedencentral", "uk", "francecentral")
        self.rejects(v.check_location, "Sweden Central", "a", "west-europe", "x" * 41)

    def test_blob_container(self) -> None:
        self.accepts(v.check_container, "abc", "arsm-profile-pictures", "a" * 63)
        self.rejects(v.check_container, "ab", "a" * 64, "-abc", "abc-", "a--b", "Abc")


class PublicUrlTests(CheckCase):
    def test_bare_https_origin_is_fine(self) -> None:
        self.accepts(v.check_public_url, "https://arsm.hu", "https://app.arsm.example.test")

    def test_each_rule_has_its_own_reason(self) -> None:
        cases = {
            "http://arsm.hu": "https://",
            "arsm.hu": "https://",
            "https://localhost": "public domain",
            "https://": "public domain",
            "https://arsm.hu/": "bare origin",
            "https://arsm.hu/path": "bare origin",
            "https://arsm.hu?x=1": "bare origin",
            "https://arsm.hu#frag": "bare origin",
            "https://arsm.hu:8443": "bare origin",
            "https://user@arsm.hu": "bare origin",
            "https://arsm.hu:99999": "not a valid URL",
        }
        for value, fragment in cases.items():
            with self.subTest(value=value):
                self.assertIn(fragment, v.check_public_url(value) or "")


class SecretRuleTests(CheckCase):
    def test_postgres_password_length_and_classes(self) -> None:
        self.accepts(v.check_postgres_password, "Abcdefg1", "Aa1-" + "x" * 124, "abcdEFGH!")
        self.rejects(v.check_postgres_password, "Abcdef1", "A1" + "x" * 127, "abcdefgh1", "ABCDEFGH1", "abcdefgh")

    def test_postgres_password_reason_is_value_free(self) -> None:
        value = "short1A"
        self.assertNotIn(value, v.check_postgres_password(value) or "")

    def test_jwt_secret_counts_bytes_not_characters(self) -> None:
        self.accepts(v.check_jwt_secret, "x" * 32, "é" * 16)
        self.rejects(v.check_jwt_secret, "x" * 31, "é" * 15)

    def test_gate_token_counts_characters(self) -> None:
        self.accepts(v.check_gate_token, "x" * 32)
        self.rejects(v.check_gate_token, "x" * 31, "")

    def test_resend_api_key(self) -> None:
        self.accepts(v.check_resend_api_key, "re_" + "x" * 17, "re_" + "x" * 40)
        self.rejects(v.check_resend_api_key, "re_" + "x" * 16, "xx_" + "x" * 30, "x" * 30)


class MailTests(CheckCase):
    def test_email(self) -> None:
        self.accepts(v.check_email, "a@b.co", "first.last@sub.example.test")
        self.rejects(v.check_email, "a@b", "a b@c.de", "@b.co", "a@@b.co", "plain")

    def test_mail_from_accepts_an_address_or_a_display_name(self) -> None:
        self.accepts(v.check_mail_from, "info@arsm.hu", "ARSM Autoszerviz <info@arsm.hu>", "  info@arsm.hu  ")

    def test_mail_from_rejects_bad_addresses_and_header_injection(self) -> None:
        self.rejects(v.check_mail_from, "Name <bad>", "Name <a@b.co", "no at sign")
        self.assertIn("line breaks", v.check_mail_from("a@b.co\nBcc: x@y.zz"))
        self.assertIn("line breaks", v.check_mail_from("a@b.co\r"))


class EnumBackedTests(CheckCase):
    def setUp(self) -> None:
        patcher = mock.patch.object(v, "read_enum_names", return_value=["Alpha", "Beta", "Gamma"])
        patcher.start()
        self.addCleanup(patcher.stop)

    def test_specialization_must_be_one_enum_name(self) -> None:
        self.accepts(v.check_specialization, "Alpha", "Gamma")
        self.assertEqual(v.check_specialization("alpha"), "must be one of: Alpha, Beta, Gamma")

    def test_expertise_list(self) -> None:
        self.accepts(v.check_expertise, "Alpha", "Alpha, Beta", " Beta ,Gamma,")

    def test_expertise_needs_at_least_one_name(self) -> None:
        for value in ("", " , ,"):
            self.assertIn("needs 1-10", v.check_expertise(value) or "")

    def test_expertise_allows_at_most_ten_names(self) -> None:
        names = [f"N{index}" for index in range(11)]
        with mock.patch.object(v, "read_enum_names", return_value=names):
            self.assertIsNone(v.check_expertise(",".join(names[:10])))
            self.assertIn("needs 1-10", v.check_expertise(",".join(names)) or "")

    def test_expertise_names_must_be_unique_and_known(self) -> None:
        self.assertEqual(v.check_expertise("Alpha,Alpha"), "names must be unique")
        reason = v.check_expertise("Alpha,Delta")
        self.assertIn("unknown name(s): Delta", reason)
        self.assertIn("valid: Alpha, Beta, Gamma", reason)

    def test_parse_expertise_trims_and_drops_blanks(self) -> None:
        self.assertEqual(v.parse_expertise(" a, ,b ,"), ["a", "b"])
        self.assertEqual(v.parse_expertise(""), [])


class NumberAndFlagTests(CheckCase):
    def test_always_on_flags_ignore_case(self) -> None:
        self.accepts(v.check_always_on, "true", "FALSE", "True")
        self.rejects(v.check_always_on, "yes", "1", "", "tru")

    def test_whole_number_parser(self) -> None:
        self.assertEqual((v.parse_whole_number("0"), v.parse_whole_number("007"), v.parse_whole_number("123456789")), (0, 7, 123456789))
        for value in ("", "-1", "1.5", "abc", "1234567890", " 1"):
            with self.subTest(value=value):
                self.assertIsNone(v.parse_whole_number(value))

    def test_monthly_budget_allows_zero(self) -> None:
        self.accepts(v.check_monthly_budget, "0", "500")
        self.rejects(v.check_monthly_budget, "-1", "1.5", "abc", "")

    def test_log_quota_starts_at_one(self) -> None:
        self.accepts(v.check_log_daily_quota, "1", "50")
        self.rejects(v.check_log_daily_quota, "0", "abc", "-3")


if __name__ == "__main__":
    unittest.main()
