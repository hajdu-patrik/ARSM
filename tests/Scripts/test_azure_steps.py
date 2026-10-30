"""azure_deploy.steps: registry, infra, dns and bind-domain command construction with a recording runner."""

from __future__ import annotations

import json
import unittest
from contextlib import contextmanager
from pathlib import Path
from types import SimpleNamespace
from unittest import mock

from scriptsupport import TempDirCase

from azure_deploy import steps
from azure_deploy.errors import StepFailure
from azure_fixtures import FakeRunner, make_config

SHA, TAG = "a" * 40, "a" * 12
OUTPUTS = {"publicUrl": {"type": "String", "value": "https://app.example.test"},
           "environmentStaticIp": {"type": "String", "value": "203.0.113.7"},
           "customDomainVerificationId": {"type": "String", "value": "verify-123"}}


@contextmanager
def fake_export(_runner, _sha):  # noqa: ANN001, ANN202
    yield Path("export-dir")


class ParseOutputsTests(unittest.TestCase):
    def test_values_are_flattened_and_stringified(self) -> None:
        self.assertEqual(steps.parse_outputs(json.dumps({"a": {"type": "String", "value": "x"}, "n": {"value": 5}})), {"a": "x", "n": "5"})

    def test_empty_or_null_outputs_are_an_empty_mapping(self) -> None:
        for text in ("{}", "null"):
            self.assertEqual(steps.parse_outputs(text), {})

    def test_unreadable_outputs_are_a_step_failure(self) -> None:
        for text in ("not json", "", '{"a": {"type": "String"}}', '{"a": "plain"}', "[1]"):
            with self.subTest(text=text), self.assertRaisesRegex(StepFailure, "outputs could not be read"):
                steps.parse_outputs(text)

    def test_print_outputs_shows_known_values_and_placeholders(self) -> None:
        runner = FakeRunner()
        steps.print_outputs(runner, {"publicUrl": "https://x", "postgresHost": "db.example.test"})
        self.assertIn("  publicUrl: https://x", runner.lines)
        self.assertIn("  postgresHost: db.example.test", runner.lines)
        self.assertIn("  environmentStaticIp: <known after the real deployment>", runner.lines)


class DnsTests(TempDirCase):
    def test_record_names_use_the_subdomain_of_the_last_two_labels(self) -> None:
        self.assertEqual(steps.record_names("arsm.hu"), ("@", "asuid"))
        self.assertEqual(steps.record_names("app.arsm.hu"), ("app", "asuid.app"))
        self.assertEqual(steps.record_names("a.b.arsm.hu"), ("a.b", "asuid.a.b"))
        self.assertEqual(steps.record_names("localhost"), ("@", "asuid"))

    def test_dns_prints_the_exact_records_from_given_outputs(self) -> None:
        config = make_config(self.tmp, ARSM_PUBLIC_URL="https://app.arsm.example.test")
        runner = FakeRunner()
        steps.dns(runner, config, {"environmentStaticIp": "203.0.113.7", "customDomainVerificationId": "verify-123"})
        text = "\n".join(runner.lines)
        self.assertIn("Cloudflare DNS records for app.arsm.example.test (zone example.test)", text)
        self.assertIn("A    name=app.arsm  content=203.0.113.7  proxy=DNS only", text)
        self.assertIn("TXT  name=asuid.app.arsm  content=verify-123  proxy=DNS only", text)
        self.assertIn(steps.CLOUDFLARE_NOTE, text)
        self.assertEqual(runner.calls, [])

    def test_dns_without_outputs_reads_them_from_the_last_deployment(self) -> None:
        runner = FakeRunner(responses=lambda args: json.dumps(OUTPUTS) if args[:3] == ["az", "deployment", "group"] else "")
        steps.dns(runner, make_config(self.tmp))
        self.assertIn("deployment group show", runner.commands()[1])
        self.assertIn("content=203.0.113.7", "\n".join(runner.lines))

    def test_dns_in_dry_run_prints_placeholders(self) -> None:
        runner = FakeRunner(dry_run=True)
        steps.dns(runner, make_config(self.tmp))
        text = "\n".join(runner.lines)
        self.assertIn("<environmentStaticIp>", text)
        self.assertIn("<customDomainVerificationId>", text)


class RegistryAndDomainTests(TempDirCase):
    def test_registry_creates_the_group_deploys_the_bicep_and_logs_in(self) -> None:
        config = make_config(self.tmp, ARSM_ACR_NAME="arsmsteps1", ARSM_AZURE_LOCATION="francecentral")
        runner = FakeRunner()
        with mock.patch.object(steps, "exported_commit", fake_export):
            steps.registry(runner, config, SHA)
        commands = runner.commands()
        self.assertEqual(commands[0], f"az account set --subscription {config.subscription_id}")
        self.assertEqual(commands[1], f"az group create --name {config.resource_group} --location francecentral --output none")
        self.assertIn("--name arsm-registry --template-file export-dir/deploy/azure/registry.bicep --parameters acrName=arsmsteps1", commands[2])
        self.assertEqual(commands[3], "az acr login --name arsmsteps1")

    def test_bind_domain_adds_the_hostname_then_binds_a_managed_certificate(self) -> None:
        config = make_config(self.tmp, ARSM_PUBLIC_URL="https://app.arsm.example.test")
        runner = FakeRunner()
        steps.bind_domain(runner, config)
        base = f"--name arsm-web --resource-group {config.resource_group} --hostname app.arsm.example.test"
        self.assertEqual(runner.commands()[1], f"az containerapp hostname add {base}")
        self.assertEqual(runner.commands()[2], f"az containerapp hostname bind {base} --environment arsm-env --validation-method HTTP")
        self.assertIn("Bound app.arsm.example.test", runner.lines[-1])


class ManagedCertificateTests(TempDirCase):
    def test_returns_the_certificate_name_with_a_read_only_query(self) -> None:
        config = make_config(self.tmp, ARSM_PUBLIC_URL="https://app.arsm.example.test")
        runner = FakeRunner(responses=lambda args: "cert-name\n")
        self.assertEqual(steps.managed_certificate_name(runner, config), "cert-name")
        call = runner.calls[0]
        self.assertTrue(call.read_only and call.capture)
        self.assertIn("[?properties.subjectName=='app.arsm.example.test'].name | [0]", call.args)

    def test_a_failing_lookup_means_no_certificate_yet(self) -> None:
        runner = FakeRunner(fail_when=lambda args: True)
        self.assertEqual(steps.managed_certificate_name(runner, make_config(self.tmp)), "")


def deployment(runner: FakeRunner, name: str):  # noqa: ANN201
    """The recorded `az deployment group create` call with the given deployment name."""
    for call in runner.calls:
        if call.args[:4] == ["az", "deployment", "group", "create"] and call.args[call.args.index("--name") + 1] == name:
            return call
    raise AssertionError(f"no deployment {name} recorded")


def order_of(runner: FakeRunner) -> list[str]:
    names = []
    for call in runner.calls:
        if call.args == ["MIGRATE"]:
            names.append("migrate")
        elif call.args[:4] == ["az", "deployment", "group", "create"]:
            names.append(call.args[call.args.index("--name") + 1])
    return names


class InfraTests(TempDirCase):
    def run_infra(self, dry_run: bool = False):
        config = make_config(self.tmp, ARSM_ACR_NAME="arsmsteps1")
        runner = FakeRunner(dry_run=dry_run, responses=lambda args: json.dumps(OUTPUTS) if "arsm-main" in args else "")

        def migrate(run, _config) -> None:  # noqa: ANN001
            run.calls.append(SimpleNamespace(args=["MIGRATE"], env_extra=None, cwd=None, capture=False, read_only=False))

        with mock.patch.object(steps, "exported_commit", fake_export), mock.patch.object(steps, "managed_certificate_name", return_value="cert-1"),                 mock.patch.object(steps, "run_migration_job", migrate):
            outputs = steps.infra(runner, config, SHA, TAG)
        return outputs, runner, config

    def test_two_phases_with_the_migration_job_between_them(self) -> None:
        _, runner, _ = self.run_infra()
        self.assertEqual(order_of(runner), ["arsm-main-pre-apps", "migrate", "arsm-main"])

    def test_images_are_verified_before_anything_is_deployed(self) -> None:
        _, runner, _ = self.run_infra()
        commands = runner.commands()
        self.assertTrue(commands[0].startswith("az account set"))
        self.assertEqual([c.split("--image ")[1].split()[0] for c in commands[1:4]], [f"arsm-{k}:{TAG}" for k in ("api", "web", "gate")])

    def test_phase_environments_carry_the_secrets_only_in_env_extra(self) -> None:
        _, runner, config = self.run_infra()
        phase1, phase2 = deployment(runner, "arsm-main-pre-apps"), deployment(runner, "arsm-main")
        self.assertEqual((phase1.env_extra["ARSM_DEPLOY_APPS"], phase2.env_extra["ARSM_DEPLOY_APPS"]), ("false", "true"))
        for call in (phase1, phase2):
            self.assertEqual(call.env_extra["ARSM_CUSTOM_DOMAIN_CERT"], "cert-1")
            self.assertEqual(call.env_extra["ARSM_API_IMAGE"], f"arsmsteps1.azurecr.io/arsm-api:{TAG}")
            self.assertEqual(call.env_extra["ARSM_JWT_SECRET"], config.values["ARSM_JWT_SECRET"])
            self.assertNotIn(config.values["ARSM_JWT_SECRET"], " ".join(call.args))
        self.assertIn("export-dir/deploy/azure/main.bicepparam", " ".join(phase1.args))
        self.assertTrue(phase2.capture)
        self.assertIn("properties.outputs", phase2.args)

    def test_outputs_are_returned_and_printed(self) -> None:
        outputs, runner, _ = self.run_infra()
        self.assertEqual(outputs["environmentStaticIp"], "203.0.113.7")
        self.assertIn("  publicUrl: https://app.example.test", runner.lines)

    def test_a_failing_migration_stops_before_the_apps_are_deployed(self) -> None:
        def failing(*_args, **_kwargs) -> None:  # noqa: ANN002, ANN003
            raise StepFailure("Migration job execution x ended as Failed")

        config = make_config(self.tmp)
        runner = FakeRunner()
        with mock.patch.object(steps, "exported_commit", fake_export), mock.patch.object(steps, "managed_certificate_name", return_value=""), \
                mock.patch.object(steps, "run_migration_job", failing):
            with self.assertRaisesRegex(StepFailure, "ended as Failed"):
                steps.infra(runner, config, SHA, TAG)
        deployments = [call for call in runner.calls if call.args[:3] == ["az", "deployment", "group"]]
        self.assertEqual(len(deployments), 1)

    def test_dry_run_returns_no_outputs_and_prints_placeholders(self) -> None:
        outputs, runner, _ = self.run_infra(dry_run=True)
        self.assertEqual(outputs, {})
        self.assertIn("  publicUrl: <known after the real deployment>", runner.lines)

    def test_read_outputs_parses_the_last_deployment_and_is_empty_in_dry_run(self) -> None:
        config = make_config(self.tmp)
        live = FakeRunner(responses=lambda args: json.dumps(OUTPUTS) if "show" in args else "")
        self.assertEqual(steps.read_outputs(live, config)["customDomainVerificationId"], "verify-123")
        self.assertEqual(steps.read_outputs(FakeRunner(dry_run=True), config), {})


if __name__ == "__main__":
    unittest.main()
