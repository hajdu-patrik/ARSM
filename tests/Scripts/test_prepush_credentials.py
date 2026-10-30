"""scripts/prepush: envtools, credentials and the constants they build on."""

from __future__ import annotations

import dataclasses
import re
import unittest

import scriptsupport  # noqa: F401  (puts scripts/ on sys.path)
from prepush import constants
from prepush.credentials import InfraCredentials, build_api_environment
from prepush.envtools import drop_env, drop_prefixed, set_env


class EnvToolsTests(unittest.TestCase):
    def test_drop_env_removes_every_spelling(self) -> None:
        env = {"Path": "1", "PATH": "2", "path": "3", "OTHER": "4"}
        drop_env(env, "path")
        self.assertEqual(env, {"OTHER": "4"})

    def test_drop_env_ignores_missing_keys(self) -> None:
        env = {"A": "1"}
        drop_env(env, "B")
        self.assertEqual(env, {"A": "1"})

    def test_set_env_replaces_differently_cased_duplicates(self) -> None:
        env = {"foo": "old", "FOO": "older", "BAR": "1"}
        set_env(env, "Foo", "new")
        self.assertEqual(env, {"BAR": "1", "Foo": "new"})

    def test_drop_prefixed_matches_case_insensitively(self) -> None:
        env = {"Bootstrap__Admin__Email": "x", "BOOTSTRAP__A": "y", "JwtSettings__Secret": "z", "KEEP": "1"}
        drop_prefixed(env, ("BOOTSTRAP__", "JWTSETTINGS__"))
        self.assertEqual(env, {"KEEP": "1"})


class InfraCredentialsTests(unittest.TestCase):
    def test_generated_values_have_the_documented_shape(self) -> None:
        credentials = InfraCredentials.generate()
        self.assertRegex(credentials.jwt_secret, r"^[0-9a-f]{64}$")
        self.assertRegex(credentials.s3_access_key, r"^pp[0-9a-f]{12}$")
        for password in (credentials.postgres_password, credentials.s3_secret_key, credentials.sql_reader_password):
            self.assertRegex(password, r"^Pp[0-9a-f]{24}Aa1!$")

    def test_passwords_pass_the_identity_policy_classes(self) -> None:
        password = InfraCredentials.generate().postgres_password
        for pattern in (r"[a-z]", r"[A-Z]", r"\d", r"[^A-Za-z0-9]"):
            self.assertIsNotNone(re.search(pattern, password), pattern)

    def test_every_run_gets_fresh_secrets(self) -> None:
        self.assertNotEqual(InfraCredentials.generate(), InfraCredentials.generate())

    def test_values_lists_all_five_secrets(self) -> None:
        credentials = InfraCredentials.generate()
        self.assertEqual(sorted(credentials.values()), sorted(dataclasses.astuple(credentials)))
        self.assertEqual(len(set(credentials.values())), 5)

    def test_credentials_are_immutable(self) -> None:
        with self.assertRaises(dataclasses.FrozenInstanceError):
            InfraCredentials.generate().jwt_secret = "x"  # type: ignore[misc]


class BuildApiEnvironmentTests(unittest.TestCase):
    def setUp(self) -> None:
        self.credentials = InfraCredentials.generate()
        self.base = {"PATH": "/bin", "HOME": "/home/x"}

    def build(self, base: dict[str, str] | None = None) -> dict[str, str]:
        return build_api_environment(self.base if base is None else base, self.credentials, "admin@example.test", "Adm1n!pass")

    def test_unrelated_variables_are_kept_and_the_input_is_not_mutated(self) -> None:
        before = dict(self.base)
        env = self.build()
        self.assertEqual(env["PATH"], "/bin")
        self.assertEqual(self.base, before)

    def test_leaking_variables_are_scrubbed_in_any_casing(self) -> None:
        base = {**self.base, "connectionstrings__other": "x", "BOOTSTRAP__Admin__Email": "old@example.test",
                "ObjectStorage__Bucket": "b", "COMPANYPROFILE__Name": "n", "jwtsettings__Issuer": "i",
                "aspnetcore_environment": "Production", "ASPNETCORE_URLS": "http://0.0.0.0", "DOTNET_ENVIRONMENT": "Production"}
        env = self.build(base)
        for leaked in ("connectionstrings__other", "BOOTSTRAP__Admin__Email", "ObjectStorage__Bucket", "COMPANYPROFILE__Name",
                       "jwtsettings__Issuer", "aspnetcore_environment", "ASPNETCORE_URLS", "DOTNET_ENVIRONMENT"):
            self.assertNotIn(leaked, env)

    def test_the_overridden_values_appear_exactly_once(self) -> None:
        base = {**self.base, "bootstrap__admin__email": "old@example.test"}
        env = self.build(base)
        keys = [name for name in env if name.upper() == "BOOTSTRAP__ADMIN__EMAIL"]
        self.assertEqual(keys, ["Bootstrap__Admin__Email"])
        self.assertEqual(env["Bootstrap__Admin__Email"], "admin@example.test")
        self.assertEqual(env["Bootstrap__Admin__Password"], "Adm1n!pass")

    def test_infrastructure_addressing_uses_the_gate_constants_and_fresh_credentials(self) -> None:
        env = self.build()
        connection = env["ConnectionStrings__AutoServiceDb"]
        for part in (f"Host={constants.INFRA_HOST}", f"Port={constants.POSTGRES_HOST_PORT}",
                     f"Database={constants.DATABASE_NAME}", f"Password={self.credentials.postgres_password}"):
            self.assertIn(part, connection)
        self.assertEqual(env["JwtSettings__Secret"], self.credentials.jwt_secret)
        self.assertEqual(env["ObjectStorage__ServiceUrl"], f"http://{constants.INFRA_HOST}:{constants.S3_HOST_PORT}")
        self.assertEqual(env["ObjectStorage__AccessKeyId"], self.credentials.s3_access_key)
        self.assertEqual(env["ObjectStorage__SecretAccessKey"], self.credentials.s3_secret_key)
        self.assertEqual(env["ObjectStorage__AutoCreateBucket"], "true")

    def test_bootstrap_admin_and_company_profile_are_fully_defined(self) -> None:
        env = self.build()
        for key in ("FirstName", "LastName", "Specialization", "Expertise__0"):
            self.assertTrue(env[f"Bootstrap__Admin__{key}"], key)
        for key in ("Name", "AddressLine", "PostalCode", "City", "TaxNumber", "PhoneNumber", "Email"):
            self.assertTrue(env[f"CompanyProfile__{key}"], key)
        self.assertEqual(env["PGGSSENCMODE"], "disable")


class ConstantsTests(unittest.TestCase):
    def test_stage_order(self) -> None:
        self.assertEqual(constants.STAGE_NAMES, ("validate", "backend", "frontend", "e2e", "api-suites"))

    def test_gate_ports_are_distinct_and_below_the_windows_dynamic_range(self) -> None:
        ports = [constants.POSTGRES_HOST_PORT, constants.S3_HOST_PORT, constants.API_HOST_PORT]
        self.assertEqual(len(set(ports)), 3)
        self.assertTrue(all(1024 < port < 49152 for port in ports))

    def test_container_names_are_distinct_and_marked_as_prepush(self) -> None:
        self.assertNotEqual(constants.POSTGRES_CONTAINER, constants.S3_CONTAINER)
        for name in (constants.POSTGRES_CONTAINER, constants.S3_CONTAINER):
            self.assertTrue(name.startswith("arsm-prepush-"))

    def test_timeouts_are_strings_because_they_go_into_an_environment(self) -> None:
        for value in (constants.DEFAULT_COMMAND_TIMEOUT_SECONDS, constants.DEFAULT_VALIDATE_TIMEOUT_SECONDS):
            self.assertIsInstance(value, str)
            self.assertTrue(value.isdigit())

    def test_required_local_secrets_and_blocking_sections(self) -> None:
        self.assertEqual(constants.REQUIRED_LOCAL_SECRETS, ("ARSM_TEST_ADMIN_EMAIL", "ARSM_TEST_ADMIN_PASSWORD"))
        self.assertIn("Bootstrap", constants.BLOCKING_LOCAL_SECTIONS)

    def test_ci_origins_are_https(self) -> None:
        self.assertTrue(constants.CI_VITE_API_URL.startswith("https://"))
        self.assertTrue(constants.CI_VITE_SITE_URL.startswith("https://"))


if __name__ == "__main__":
    unittest.main()
