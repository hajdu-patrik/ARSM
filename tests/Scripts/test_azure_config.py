"""azure_deploy.config: issue collection, the distinctness rules and the loaded DeployConfig."""

from __future__ import annotations

import unittest

from scriptsupport import TempDirCase

from azure_deploy import config as cfg
from azure_deploy.constants import OPTIONAL_DEFAULTS, REQUIRED_KEYS, SECRET_KEYS
from azure_deploy.errors import ConfigError
from azure_fixtures import fake_password, make_config, valid_env


def issues_of(raw: dict[str, str]) -> dict[str, list[str]]:
    found: dict[str, list[str]] = {}
    for issue in cfg.collect_issues(raw):
        found.setdefault(issue.key, []).append(issue.reason)
    return found


class CollectIssuesTests(unittest.TestCase):
    def test_a_complete_env_has_no_issues(self) -> None:
        self.assertEqual(cfg.collect_issues(valid_env()), [])

    def test_every_required_key_is_reported_missing_when_absent_or_empty(self) -> None:
        for key in REQUIRED_KEYS:
            for broken in ("absent", "empty"):
                raw = valid_env()
                if broken == "absent":
                    del raw[key]
                else:
                    raw[key] = ""
                with self.subTest(key=key, how=broken):
                    self.assertIn("missing", issues_of(raw)[key])

    def test_template_placeholders_are_reported_instead_of_the_format_reason(self) -> None:
        for marker in ("CHANGE_ME", "changeme", "Set_Unique_Local"):
            raw = valid_env()
            raw["ARSM_JWT_SECRET"] = f"x{marker}x"
            with self.subTest(marker=marker):
                self.assertEqual(issues_of(raw)["ARSM_JWT_SECRET"], ["still holds a template placeholder"])

    def test_invalid_values_get_the_check_reason(self) -> None:
        raw = {**valid_env(), "ARSM_AZURE_SUBSCRIPTION_ID": "nope", "ARSM_PUBLIC_URL": "http://arsm.example.test"}
        found = issues_of(raw)
        self.assertEqual(found["ARSM_AZURE_SUBSCRIPTION_ID"], ["must be a subscription GUID"])
        self.assertEqual(found["ARSM_PUBLIC_URL"], ["must start with https://"])

    def test_optional_keys_default_when_unset_or_empty_but_are_checked_when_set(self) -> None:
        raw = valid_env()
        self.assertEqual(issues_of({**raw, "ARSM_API_ALWAYS_ON": ""}), {})
        self.assertIn("ARSM_API_ALWAYS_ON", issues_of({**raw, "ARSM_API_ALWAYS_ON": "maybe"}))
        self.assertIn("ARSM_ALERT_EMAIL", issues_of({**raw, "ARSM_ALERT_EMAIL": "not-an-email"}))

    def test_a_budget_needs_an_alert_address(self) -> None:
        raw = {**valid_env(), "ARSM_MONTHLY_BUDGET": "100"}
        self.assertEqual(issues_of(raw)["ARSM_MONTHLY_BUDGET"], ["needs ARSM_ALERT_EMAIL, the address its mails go to"])
        self.assertEqual(issues_of({**raw, "ARSM_ALERT_EMAIL": "ops@example.test"}), {})
        self.assertEqual(issues_of({**valid_env(), "ARSM_MONTHLY_BUDGET": "0"}), {})

    def test_an_invalid_budget_is_reported_once_by_its_own_check(self) -> None:
        found = issues_of({**valid_env(), "ARSM_MONTHLY_BUDGET": "abc"})
        self.assertEqual(found["ARSM_MONTHLY_BUDGET"], ["must be a whole number, 0 for no budget"])

    def test_gate_token_must_differ_from_the_teszt_token_ignoring_case_and_spaces(self) -> None:
        raw = valid_env()
        raw["GATE_TOKEN"] = f"  {raw['ARSM_PROD_GATE_TOKEN'].upper()} "
        self.assertEqual(issues_of(raw)["ARSM_PROD_GATE_TOKEN"], ["must differ from GATE_TOKEN (no reuse of teszt or dev values)"])

    def test_a_different_teszt_token_is_fine(self) -> None:
        self.assertEqual(issues_of({**valid_env(), "GATE_TOKEN": "another-" + "x" * 32}), {})

    def test_app_database_password_must_differ_from_the_administrator_password(self) -> None:
        raw = valid_env()
        raw["ARSM_POSTGRES_APP_PASSWORD"] = raw["ARSM_POSTGRES_PASSWORD"]
        found = issues_of(raw)
        self.assertEqual(len(found["ARSM_POSTGRES_APP_PASSWORD"]), 1)
        self.assertIn("must differ from ARSM_POSTGRES_PASSWORD", found["ARSM_POSTGRES_APP_PASSWORD"][0])

    def test_the_prod_admin_may_reuse_the_dev_admin_login(self) -> None:
        raw = valid_env()
        raw.update(ADMIN_EMAIL=raw["ARSM_PROD_ADMIN_EMAIL"], ADMIN_PASSWORD=raw["ARSM_PROD_ADMIN_PASSWORD"])
        self.assertEqual(cfg.collect_issues(raw), [])

    def test_reasons_never_contain_secret_values(self) -> None:
        raw = valid_env()
        bad = {key: "short" + fake_password()[:2] for key in SECRET_KEYS}
        bad["ARSM_PROD_GATE_TOKEN"] = "gate-" + bad["ARSM_PROD_GATE_TOKEN"]
        raw.update(bad)
        reasons = " ".join(issue.reason for issue in cfg.collect_issues(raw))
        for key, value in bad.items():
            with self.subTest(key=key):
                self.assertNotIn(value, reasons)


class LoadConfigTests(TempDirCase):
    def test_missing_file(self) -> None:
        with self.assertRaisesRegex(ConfigError, "Root .env not found"):
            cfg.load_config(self.tmp / ".env")

    def test_invalid_file_lists_every_key_without_values(self) -> None:
        values = {**valid_env(), "ARSM_ACR_NAME": "BAD NAME", "ARSM_JWT_SECRET": "tooshort"}
        del values["ARSM_COMPANY_CITY"]
        path = self.write(".env", "".join(f"{k}={v}\n" for k, v in values.items()))
        with self.assertRaises(ConfigError) as raised:
            cfg.load_config(path)
        message = str(raised.exception)
        self.assertIn("  ARSM_ACR_NAME: 5-50 lowercase letters and digits only", message)
        self.assertIn("  ARSM_JWT_SECRET: must be at least 32 bytes", message)
        self.assertIn("  ARSM_COMPANY_CITY: missing", message)
        self.assertNotIn("BAD NAME", message)
        self.assertNotIn("tooshort", message)

    def test_valid_file_applies_the_documented_defaults(self) -> None:
        config = make_config(self.tmp)
        for key, default in OPTIONAL_DEFAULTS.items():
            self.assertEqual(config.values[key], default, key)
        for key in REQUIRED_KEYS:
            self.assertIn(key, config.values)
        self.assertNotIn("ARSM_ALERT_EMAIL", config.values)

    def test_optional_values_override_the_defaults_and_unset_ones_appear_when_given(self) -> None:
        config = make_config(self.tmp, ARSM_AZURE_LOCATION="francecentral", ARSM_ALERT_EMAIL="ops@example.test",
                             ARSM_PROD_ADMIN_MIDDLE_NAME="Mid")
        self.assertEqual(config.location, "francecentral")
        self.assertEqual((config.values["ARSM_ALERT_EMAIL"], config.values["ARSM_PROD_ADMIN_MIDDLE_NAME"]), ("ops@example.test", "Mid"))

    def test_masker_knows_every_secret_key_and_other_sensitively_named_env_values(self) -> None:
        extra = fake_password()
        config = make_config(self.tmp, SOME_API_TOKEN=extra)
        for key in SECRET_KEYS:
            self.assertNotIn(config.values[key], config.masker.mask(f"leak {config.values[key]} end"), key)
        self.assertNotIn(extra, config.masker.mask(f"x {extra}"))

    def test_derived_properties(self) -> None:
        config = make_config(self.tmp, ARSM_ACR_NAME="arsmprops1", ARSM_PUBLIC_URL="https://app.arsm.example.test")
        self.assertEqual(config.registry_host, "arsmprops1.azurecr.io")
        self.assertEqual(config.hostname, "app.arsm.example.test")
        self.assertEqual(config.resource_group, config.values["ARSM_AZURE_RESOURCE_GROUP"])
        self.assertEqual(config.subscription_id, config.values["ARSM_AZURE_SUBSCRIPTION_ID"])

    def test_image_names_and_the_az_environment(self) -> None:
        config = make_config(self.tmp, ARSM_ACR_NAME="arsmprops1", ARSM_API_ALWAYS_ON="TRUE", ARSM_WEB_ALWAYS_ON="False")
        self.assertEqual(config.image_names("abc123def456"), {
            "api": "arsmprops1.azurecr.io/arsm-api:abc123def456",
            "web": "arsmprops1.azurecr.io/arsm-web:abc123def456",
            "gate": "arsmprops1.azurecr.io/arsm-gate:abc123def456"})
        env = config.az_environment("tag1")
        self.assertEqual((env["ARSM_API_IMAGE"], env["ARSM_GATE_IMAGE"]), ("arsmprops1.azurecr.io/arsm-api:tag1", "arsmprops1.azurecr.io/arsm-gate:tag1"))
        self.assertEqual((env["ARSM_API_ALWAYS_ON"], env["ARSM_WEB_ALWAYS_ON"]), ("true", "false"))
        self.assertEqual(config.values["ARSM_API_ALWAYS_ON"], "TRUE", "the config itself is not mutated")
        self.assertEqual(env["ARSM_JWT_SECRET"], config.values["ARSM_JWT_SECRET"])


if __name__ == "__main__":
    unittest.main()
