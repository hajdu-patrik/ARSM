"""azure_deploy.checks: the check subcommand output, provider selection and the read-only provider query."""

from __future__ import annotations

import subprocess
import unittest
from unittest import mock

from scriptsupport import TempDirCase, captured

from azure_deploy import checks
from azure_deploy.constants import SECRET_KEYS
from azure_deploy.errors import ConfigError
from azure_fixtures import env_text, valid_env


class GuardRailProviderTests(unittest.TestCase):
    def test_no_alert_address_means_only_key_vault_is_checked(self) -> None:
        self.assertEqual(checks.guard_rail_providers({}), [])
        self.assertEqual(checks.checked_providers({"ARSM_MONTHLY_BUDGET": "500"}), ["Microsoft.KeyVault"])

    def test_an_alert_address_adds_insights_and_a_budget_adds_consumption(self) -> None:
        alert = {"ARSM_ALERT_EMAIL": "ops@example.test"}
        self.assertEqual(checks.guard_rail_providers(alert), ["Microsoft.Insights"])
        self.assertEqual(checks.guard_rail_providers({**alert, "ARSM_MONTHLY_BUDGET": "0"}), ["Microsoft.Insights"])
        self.assertEqual(checks.guard_rail_providers({**alert, "ARSM_MONTHLY_BUDGET": "abc"}), ["Microsoft.Insights"])
        self.assertEqual(checks.guard_rail_providers({**alert, "ARSM_MONTHLY_BUDGET": "5"}), ["Microsoft.Insights", "Microsoft.Consumption"])

    def test_key_vault_always_comes_first(self) -> None:
        raw = {"ARSM_ALERT_EMAIL": "ops@example.test", "ARSM_MONTHLY_BUDGET": "5"}
        self.assertEqual(checks.checked_providers(raw), ["Microsoft.KeyVault", "Microsoft.Insights", "Microsoft.Consumption"])


class RegistrationStateTests(unittest.TestCase):
    def query(self, completed=None, error=None, az="/bin/az"):  # noqa: ANN001
        with mock.patch.object(checks.shutil, "which", return_value=az), \
                mock.patch.object(checks.subprocess, "run", return_value=completed, side_effect=error) as run:
            return checks.registration_state("Microsoft.KeyVault", "sub-id"), run

    def test_without_az_nothing_is_asked(self) -> None:
        state, run = self.query(az=None)
        self.assertIsNone(state)
        run.assert_not_called()

    def test_the_query_is_one_read_only_provider_show(self) -> None:
        state, run = self.query(subprocess.CompletedProcess([], 0, "Registered\n", ""))
        self.assertEqual(state, "Registered")
        self.assertEqual(run.call_args.args[0], ["/bin/az", "provider", "show", "--namespace", "Microsoft.KeyVault",
                                                   "--subscription", "sub-id", "--query", "registrationState", "--output", "tsv"])
        self.assertEqual(run.call_args.kwargs["timeout"], checks.PROVIDER_QUERY_TIMEOUT_SECONDS)

    def test_anything_unexpected_means_unknown(self) -> None:
        for completed in (subprocess.CompletedProcess([], 1, "Registered\n", ""), subprocess.CompletedProcess([], 0, "", ""),
                          subprocess.CompletedProcess([], 0, "two words\n", "")):
            with self.subTest(code=completed.returncode, out=completed.stdout):
                self.assertIsNone(self.query(completed)[0])
        for error in (OSError("gone"), subprocess.TimeoutExpired("az", 60)):
            with self.subTest(error=type(error).__name__):
                self.assertIsNone(self.query(error=error)[0])


class RunCheckTests(TempDirCase):
    def run_check(self, values: dict[str, str] | None = None, *, tools: set[str] | None = None, state="Registered"):  # noqa: ANN001
        self.write(".env", env_text(valid_env() if values is None else values))
        present = {"az", "docker", "git"} if tools is None else tools
        with mock.patch.object(checks, "ENV_FILE", self.tmp / ".env"), \
                mock.patch.object(checks.shutil, "which", lambda name: f"/bin/{name}" if name in present else None), \
                mock.patch.object(checks, "registration_state", side_effect=state if callable(state) else None, return_value=state) as asked, \
                captured() as (out, _):
            try:
                checks.run_check()
                error = None
            except ConfigError as caught:
                error = caught
        return out.getvalue(), error, asked

    def test_missing_env_file(self) -> None:
        with mock.patch.object(checks, "ENV_FILE", self.tmp / "absent.env"), self.assertRaisesRegex(ConfigError, "Root .env not found"):
            checks.run_check()

    def test_a_valid_env_passes_and_prints_key_names_only(self) -> None:
        values = valid_env()
        out, error, _ = self.run_check(values)
        self.assertIsNone(error)
        self.assertIn("All checks passed.", out)
        for section in ("Required keys:", "Optional keys:", "Tools:"):
            self.assertIn(section, out)
        self.assertIn("  ARSM_ACR_NAME: ok", out)
        self.assertIn("  ARSM_AZURE_LOCATION: default", out)
        self.assertIn("  ARSM_ALERT_EMAIL: unset", out)
        for key in SECRET_KEYS:
            self.assertNotIn(values[key], out)

    def test_a_missing_and_an_invalid_key_are_listed_and_counted(self) -> None:
        values = valid_env()
        del values["ARSM_COMPANY_CITY"]
        values["ARSM_ACR_NAME"] = "BAD"
        out, error, _ = self.run_check(values)
        self.assertIn("  ARSM_COMPANY_CITY: missing", out)
        self.assertIn("  ARSM_ACR_NAME: invalid (5-50 lowercase letters and digits only)", out)
        self.assertIn("2 problem(s) found", str(error))
        self.assertNotIn("All checks passed.", out)

    def test_an_invalid_optional_key_is_a_problem_and_a_set_one_is_ok(self) -> None:
        out, error, _ = self.run_check({**valid_env(), "ARSM_API_ALWAYS_ON": "maybe", "ARSM_ALERT_EMAIL": "ops@example.test"})
        self.assertIn("  ARSM_API_ALWAYS_ON: invalid (must be true or false)", out)
        self.assertIn("  ARSM_ALERT_EMAIL: ok", out)
        self.assertIn("1 problem(s) found", str(error))

    def test_a_missing_tool_is_a_problem(self) -> None:
        out, error, _ = self.run_check(tools={"az", "git"})
        self.assertIn("  docker: missing", out)
        self.assertIn("  az: ok", out)
        self.assertIn("1 problem(s) found", str(error))

    def test_provider_warnings_never_fail_the_check(self) -> None:
        out, error, _ = self.run_check(state=lambda provider, subscription: {"Microsoft.KeyVault": "NotRegistered"}.get(provider))
        self.assertIsNone(error)
        self.assertIn("Resource providers (a warning only):", out)
        self.assertIn("  Microsoft.KeyVault: NotRegistered, register it first: az provider register --namespace Microsoft.KeyVault", out)

    def test_an_unknown_state_is_reported_as_not_checked(self) -> None:
        out, error, _ = self.run_check(state=None)
        self.assertIsNone(error)
        self.assertIn("  Microsoft.KeyVault: not checked (needs az login and the subscription)", out)

    def test_registered_providers_and_guard_rail_providers(self) -> None:
        out, _, asked = self.run_check({**valid_env(), "ARSM_ALERT_EMAIL": "ops@example.test", "ARSM_MONTHLY_BUDGET": "5"})
        self.assertIn("  Microsoft.KeyVault: Registered", out)
        self.assertEqual([call.args[0] for call in asked.call_args_list], ["Microsoft.KeyVault", "Microsoft.Insights", "Microsoft.Consumption"])

    def test_without_a_valid_subscription_id_no_provider_is_queried(self) -> None:
        out, error, asked = self.run_check({**valid_env(), "ARSM_AZURE_SUBSCRIPTION_ID": "nope"})
        self.assertNotIn("Resource providers", out)
        asked.assert_not_called()
        self.assertIn("1 problem(s) found", str(error))


if __name__ == "__main__":
    unittest.main()
