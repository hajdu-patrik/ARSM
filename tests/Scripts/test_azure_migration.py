"""azure_deploy.migration: starting the migration job and waiting for its execution (clock and sleep injected)."""

from __future__ import annotations

from scriptsupport import TempDirCase

from azure_deploy import migration
from azure_deploy.errors import StepFailure
from azure_fixtures import FakeRunner, make_config


class MigrationJobTests(TempDirCase):
    def scripted(self, statuses: list[str], execution: str = "exec-1", dry_run: bool = False) -> FakeRunner:
        remaining = iter(statuses)

        def respond(args: list[str]) -> str:
            return f"{execution}\n" if "start" in args else f"{next(remaining)}\n"

        return FakeRunner(dry_run=dry_run, responses=respond)

    def wait(self, runner: FakeRunner, clock_values: list[float] | None = None, timeout: float = 100, poll: float = 5):
        ticks = iter(clock_values or [0.0] * 50)
        sleeps: list[float] = []
        migration.run_migration_job(runner, make_config(self.tmp), timeout_seconds=timeout, poll_seconds=poll,
                                    clock=lambda: next(ticks), sleep=sleeps.append)
        return sleeps

    def test_start_command(self) -> None:
        config = make_config(self.tmp)
        runner = self.scripted([])
        self.assertEqual(migration.start_execution(runner, config), "exec-1")
        self.assertEqual(runner.calls[0].args, [
            "az", "containerapp", "job", "start", "--resource-group", config.resource_group, "--name", "arsm-migrate",
            "--query", "name", "--output", "tsv"])
        self.assertTrue(runner.calls[0].capture)

    def test_status_command(self) -> None:
        config = make_config(self.tmp)
        runner = self.scripted(["Running"])
        self.assertEqual(migration.execution_status(runner, config, "exec-9"), "Running")
        args = runner.calls[0].args
        self.assertEqual(args[:5], ["az", "containerapp", "job", "execution", "show"])
        self.assertEqual(args[args.index("--job-execution-name") + 1], "exec-9")
        self.assertEqual(args[args.index("--query") + 1], "properties.status")

    def test_polls_until_the_execution_succeeded(self) -> None:
        runner = self.scripted(["", "Running", "Succeeded"])
        sleeps = self.wait(runner)
        self.assertEqual(sleeps, [5, 5])
        self.assertEqual(len(runner.calls), 4)
        self.assertEqual(runner.lines, [
            "  arsm-migrate execution exec-1: pending", "  arsm-migrate execution exec-1: Running",
            "  arsm-migrate execution exec-1: Succeeded"])

    def test_succeeding_at_once_never_sleeps(self) -> None:
        self.assertEqual(self.wait(self.scripted(["Succeeded"])), [])

    def test_failed_stopped_and_degraded_executions_fail_the_step(self) -> None:
        for state in ("Failed", "Stopped", "Degraded"):
            with self.subTest(state=state), self.assertRaisesRegex(StepFailure, f"execution exec-1 ended as {state}; the apps were not updated"):
                self.wait(self.scripted(["Running", state]))

    def test_the_failure_message_points_at_the_job_logs(self) -> None:
        with self.assertRaisesRegex(StepFailure, "deployment-azure.md"):
            self.wait(self.scripted(["Failed"]))

    def test_a_timeout_fails_the_step_without_updating_the_apps(self) -> None:
        runner = self.scripted(["Running", "Running", "Running"])
        with self.assertRaisesRegex(StepFailure, r"did not succeed within 25 s; the apps were not updated"):
            self.wait(runner, clock_values=[0, 10, 20, 30], timeout=25)

    def test_success_on_the_last_poll_before_the_deadline_wins(self) -> None:
        self.wait(self.scripted(["Running", "Succeeded"]), clock_values=[0, 10], timeout=25)

    def test_dry_run_starts_nothing_real_and_never_polls(self) -> None:
        runner = self.scripted([""], dry_run=True)
        sleeps = self.wait(runner)
        self.assertEqual(sleeps, [])
        self.assertEqual(len(runner.calls), 2)
        self.assertIn(migration.DRY_RUN_EXECUTION, runner.calls[1].args)

    def test_a_start_without_an_execution_name_fails_outside_dry_run(self) -> None:
        runner = FakeRunner(responses=lambda args: "\n")
        with self.assertRaisesRegex(StepFailure, "without reporting an execution name"):
            migration.start_execution(runner, make_config(self.tmp))
        self.assertEqual(migration.start_execution(FakeRunner(dry_run=True), make_config(self.tmp)), "")

    def test_state_names(self) -> None:
        self.assertEqual(migration.SUCCEEDED, "Succeeded")
        self.assertEqual(migration.FAILED_STATES, frozenset({"Failed", "Stopped", "Degraded"}))
