"""azure_deploy.cli: parser, confirmation, subcommand dispatch and exit codes."""

from __future__ import annotations

import unittest
from types import SimpleNamespace
from unittest import mock

from scriptsupport import TempDirCase, captured

from azure_deploy import cli
from azure_deploy.errors import ConfigError, StepFailure
from azure_fixtures import FakeRunner, make_config

SHA = "b" * 40
TAG = "b" * 12


class ParserTests(unittest.TestCase):
    def test_defaults(self) -> None:
        args = cli.build_parser().parse_args(["check"])
        self.assertEqual((args.subcommand, args.commit, args.dry_run, args.yes), ("check", "HEAD", False, False))

    def test_flags(self) -> None:
        args = cli.build_parser().parse_args(["images", "--commit", "v1", "--dry-run", "--yes"])
        self.assertEqual((args.commit, args.dry_run, args.yes), ("v1", True, True))

    def test_every_documented_subcommand_is_accepted_and_nothing_else(self) -> None:
        self.assertEqual(list(cli.SUBCOMMANDS), ["check", "registry", "images", "infra", "dns", "bind-domain", "release"])
        for name in cli.SUBCOMMANDS:
            self.assertEqual(cli.build_parser().parse_args([name]).subcommand, name)
        with captured(), self.assertRaises(SystemExit) as raised:
            cli.build_parser().parse_args(["destroy"])
        self.assertEqual(raised.exception.code, 2)

    def test_help_lists_each_subcommand_and_the_exit_codes(self) -> None:
        epilog = cli.build_parser().epilog
        for name in cli.SUBCOMMANDS:
            self.assertIn(name, epilog)
        self.assertIn("Exit codes: 0 ok, 1 a step failed, 2 bad config or usage.", epilog)
        self.assertIn("Nothing in this script deletes Azure resources.", epilog)


class ConfirmTests(unittest.TestCase):
    def tty(self, interactive: bool):  # noqa: ANN201
        return mock.patch.object(cli.sys, "stdin", SimpleNamespace(isatty=lambda: interactive))

    def test_yes_and_dry_run_never_ask(self) -> None:
        with mock.patch("builtins.input", side_effect=AssertionError("asked")), self.tty(False):
            cli.confirm(FakeRunner(), "Go?", True)
            cli.confirm(FakeRunner(dry_run=True), "Go?", False)

    def test_a_non_interactive_run_needs_yes(self) -> None:
        with self.tty(False), self.assertRaisesRegex(ConfigError, "stdin is not interactive; pass --yes"):
            cli.confirm(FakeRunner(), "Go?", False)

    def test_affirmative_answers_pass(self) -> None:
        for answer in ("y", "YES", " yes "):
            with self.subTest(answer=answer), self.tty(True), mock.patch("builtins.input", return_value=answer) as ask:
                cli.confirm(FakeRunner(), "Deploy it?", False)
                ask.assert_called_once_with("Deploy it? [y/N] ")

    def test_anything_else_cancels(self) -> None:
        for answer in ("n", "", "maybe", "yep"):
            with self.subTest(answer=answer), self.tty(True), mock.patch("builtins.input", return_value=answer):
                with self.assertRaisesRegex(StepFailure, "Cancelled by the user"):
                    cli.confirm(FakeRunner(), "Go?", False)


class DispatchTests(TempDirCase):
    def dispatch(self, subcommand: str, yes: bool = False):
        order: list[str] = []
        questions: list[str] = []
        config = make_config(self.tmp, ARSM_ACR_NAME="arsmcli1")

        def confirm(_runner, question, assume_yes) -> None:  # noqa: ANN001
            questions.append(question)
            order.append(f"confirm:{assume_yes}")

        with mock.patch.object(cli, "resolve_commit", side_effect=lambda runner, ref: order.append(f"resolve:{ref}") or SHA), \
                mock.patch.object(cli, "confirm", confirm), \
                mock.patch.object(cli, "build_and_push", side_effect=lambda *args: order.append("images")), \
                mock.patch.object(cli.steps, "registry", side_effect=lambda *args: order.append("registry")), \
                mock.patch.object(cli.steps, "infra", side_effect=lambda *args: order.append("infra") or {"environmentStaticIp": "1.2.3.4"}), \
                mock.patch.object(cli.steps, "dns", side_effect=lambda *args: order.append(f"dns{len(args)}")), \
                mock.patch.object(cli.steps, "bind_domain", side_effect=lambda *args: order.append("bind")):
            cli.dispatch(SimpleNamespace(subcommand=subcommand, commit="HEAD", yes=yes), config, FakeRunner())
        return order, questions, config

    def test_dns_and_bind_domain_need_no_commit(self) -> None:
        self.assertEqual(self.dispatch("dns")[0], ["dns2"])
        self.assertEqual(self.dispatch("bind-domain")[0], ["bind"])

    def test_registry_resolves_the_commit_but_does_not_ask(self) -> None:
        self.assertEqual(self.dispatch("registry")[0], ["resolve:HEAD", "registry"])

    def test_images_and_infra_ask_first_and_pass_yes_through(self) -> None:
        self.assertEqual(self.dispatch("images")[0], ["resolve:HEAD", "confirm:False", "images"])
        self.assertEqual(self.dispatch("infra", yes=True)[0], ["resolve:HEAD", "confirm:True", "infra"])

    def test_the_question_names_the_tag_and_the_resource_group(self) -> None:
        _, questions, config = self.dispatch("infra")
        self.assertIn(TAG, questions[0])
        self.assertIn(config.resource_group, questions[0])
        self.assertIn("arsmcli1.azurecr.io", self.dispatch("images")[1][0])

    def test_release_runs_registry_images_infra_and_prints_dns_from_the_outputs(self) -> None:
        order, questions, _ = self.dispatch("release")
        self.assertEqual(order, ["resolve:HEAD", "confirm:False", "registry", "images", "infra", "dns3"])
        self.assertEqual(len(questions), 1)


class MainTests(TempDirCase):
    def main(self, argv: list[str], *, check=None, config_error=None, dispatch=None):  # noqa: ANN001
        config = make_config(self.tmp)
        load = mock.patch.object(cli, "load_config", side_effect=config_error) if config_error else mock.patch.object(cli, "load_config", return_value=config)
        with mock.patch.object(cli, "run_check", side_effect=check) as run_check, load as load_config, \
                mock.patch.object(cli, "dispatch", side_effect=dispatch) as run_dispatch, mock.patch.object(cli, "CommandRunner") as runner_class, \
                captured() as (_, err):
            code = cli.main(argv)
        return code, err.getvalue(), SimpleNamespace(check=run_check, load=load_config, dispatch=run_dispatch, runner=runner_class, config=config)

    def test_check_runs_only_the_check(self) -> None:
        code, _, calls = self.main(["check"])
        self.assertEqual(code, 0)
        calls.check.assert_called_once_with()
        calls.load.assert_not_called()

    def test_a_subcommand_loads_the_config_and_builds_the_runner_from_its_masker(self) -> None:
        code, _, calls = self.main(["dns", "--dry-run"])
        self.assertEqual(code, 0)
        calls.runner.assert_called_once_with(calls.config.masker, True)
        self.assertEqual(calls.dispatch.call_args.args[1], calls.config)
        self.assertEqual(calls.dispatch.call_args.args[2], calls.runner.return_value)

    def test_config_errors_exit_2(self) -> None:
        code, err, _ = self.main(["check"], check=ConfigError("bad env"))
        self.assertEqual((code, err.strip()), (2, "[CONFIG] bad env"))
        code, err, calls = self.main(["dns"], config_error=ConfigError("no .env"))
        self.assertEqual((code, err.strip()), (2, "[CONFIG] no .env"))
        calls.dispatch.assert_not_called()

    def test_step_failures_exit_1(self) -> None:
        code, err, _ = self.main(["images"], dispatch=StepFailure("docker exited with code 1."))
        self.assertEqual((code, err.strip()), (1, "[FAIL] docker exited with code 1."))

    def test_interruption_exits_1(self) -> None:
        code, err, _ = self.main(["images"], dispatch=KeyboardInterrupt())
        self.assertEqual((code, err.strip()), (1, "[FAIL] Interrupted; temp files were removed."))

    def test_a_bad_subcommand_is_a_usage_error(self) -> None:
        with captured(), self.assertRaises(SystemExit) as raised:
            cli.main(["destroy"])
        self.assertEqual(raised.exception.code, 2)


if __name__ == "__main__":
    unittest.main()
