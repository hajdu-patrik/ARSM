"""run-local-test-suite.py: command execution, PostgreSQL resolution, the SQL suite and main()."""

from __future__ import annotations

import subprocess
import uuid
from pathlib import Path
from unittest import mock

from scriptsupport import TempDirCase, captured, load_script

runner = load_script("run-local-test-suite.py", "runner_under_test")


def fake_value(prefix: str = "zz") -> str:
    return f"{prefix}{uuid.uuid4().hex[:12]}"


class RecordingRunner:
    """Stand-in for CommandRunner that records calls and answers from a callable."""

    def __init__(self, answer=None) -> None:  # noqa: ANN001
        self.calls: list[tuple] = []
        self.answer = answer or (lambda name, command, input_text: runner.CommandResult(name, 0, "", ""))

    def run(self, name, command, cwd, environment, input_text=None):  # noqa: ANN001
        self.calls.append((name, list(command), cwd, environment, input_text))
        return self.answer(name, command, input_text)


class CommandRunnerTests(TempDirCase):
    def make(self, *secrets: str):
        return runner.CommandRunner(runner.OutputSanitizer(self.tmp, secrets))

    def test_result_is_sanitized_and_arguments_are_forwarded(self) -> None:
        secret = fake_value()
        done = subprocess.CompletedProcess([], 3, f"out {secret}", f"err {secret}")
        with mock.patch.object(runner.subprocess, "run", return_value=done) as run:
            result = self.make(secret).run("job", ["tool", "x"], self.tmp, {"K": "v"}, input_text="in")
        self.assertEqual((result.command_name, result.return_code), ("job", 3))
        self.assertNotIn(secret, result.stdout + result.stderr)
        kwargs = run.call_args.kwargs
        self.assertEqual((kwargs["cwd"], kwargs["env"], kwargs["input"], kwargs["timeout"]), (self.tmp, {"K": "v"}, "in", 300))
        self.assertFalse(kwargs["check"])

    def test_timeout_gives_return_code_124_and_keeps_partial_output(self) -> None:
        error = subprocess.TimeoutExpired("tool", 7, output=b"partial", stderr=None)
        with mock.patch.object(runner.subprocess, "run", side_effect=error):
            result = self.make().run("slow", ["tool"], self.tmp, {"ARSM_TEST_COMMAND_TIMEOUT_SECONDS": "7"})
        self.assertEqual((result.return_code, result.stdout), (124, "partial"))
        self.assertEqual(result.stderr, "slow timed out after 7 seconds.")

    def test_timeout_setting(self) -> None:
        seconds = self.make()._timeout_seconds
        self.assertEqual(seconds({}), 300)
        self.assertEqual(seconds({"ARSM_TEST_COMMAND_TIMEOUT_SECONDS": "45"}), 45)
        self.assertEqual(seconds({"ARSM_TEST_COMMAND_TIMEOUT_SECONDS": "0"}), 1)
        self.assertEqual(seconds({"ARSM_TEST_COMMAND_TIMEOUT_SECONDS": "-9"}), 1)
        self.assertEqual(seconds({"ARSM_TEST_COMMAND_TIMEOUT_SECONDS": "soon"}), 300)

    def test_timeout_output_normalisation(self) -> None:
        convert = self.make()._timeout_output
        self.assertEqual((convert(None), convert(b"b\xff"), convert("text")), ("", "b�", "text"))


class PostgresConnectionTests(TempDirCase):
    def make(self, environment: dict[str, str] | None = None):
        return runner.LocalTestRunner(self.tmp, self.tmp / "art", environment or {}, runner.OutputSanitizer(self.tmp, []))

    def uri(self, user: str = "reader", password: str = "p%40ss", database: str = "db1") -> str:
        return f"postgresql://{user}:{password}@localhost:5432/{database}"

    def test_environment_uri_is_parsed_and_unquoted(self) -> None:
        connection = self.make({"ARSM_MCP_POSTGRES_CONNECTION_STRING": self.uri()})._resolve_postgres_connection()
        self.assertEqual((connection.user, connection.password, connection.database), ("reader", "p@ss", "db1"))

    def test_missing_value_is_an_error(self) -> None:
        with self.assertRaisesRegex(RuntimeError, "connection string is missing"):
            self.make()._resolve_postgres_connection()

    def test_placeholder_falls_back_to_the_local_config_files(self) -> None:
        self.write(".claude/.mcp.json", '{"args": ["' + self.uri(database="from_claude") + '"]}')
        instance = self.make({"ARSM_MCP_POSTGRES_CONNECTION_STRING": "SET_LOCAL_VALUE"})
        self.assertEqual(instance._resolve_postgres_connection().database, "from_claude")

    def test_vscode_config_is_read_before_the_claude_config(self) -> None:
        self.write(".vscode/mcp.json", '{"u": "' + self.uri(database="from_vscode") + '"}')
        self.write(".claude/.mcp.json", '{"u": "' + self.uri(database="from_claude") + '"}')
        self.assertIn("from_vscode", self.make()._read_connection_string_from_local_config())

    def test_config_without_a_uri_is_skipped(self) -> None:
        self.write(".vscode/mcp.json", "{}")
        self.assertEqual(self.make()._read_connection_string_from_local_config(), "")

    def test_invalid_uris_are_rejected(self) -> None:
        cases = {"mysql://u:p@h/db": "must use postgres", "postgresql://u@h/db": "incomplete", "postgresql://u:p@h/": "incomplete"}
        for value, message in cases.items():
            with self.subTest(value=value):
                with self.assertRaisesRegex(RuntimeError, message):
                    self.make({"ARSM_MCP_POSTGRES_CONNECTION_STRING": value})._resolve_postgres_connection()


class ContainerDetectionTests(TempDirCase):
    def make(self, environment: dict[str, str], answer=None):
        instance = runner.LocalTestRunner(self.tmp, self.tmp / "art", environment, runner.OutputSanitizer(self.tmp, []))
        instance.command_runner = RecordingRunner(answer)
        return instance

    def test_explicit_container_wins_without_calling_docker(self) -> None:
        instance = self.make({"ARSM_SQL_TEST_CONTAINER": " my-db "})
        self.assertEqual(instance._detect_postgres_container("docker"), "my-db")
        self.assertEqual(instance.command_runner.calls, [])

    def test_first_postgres_container_is_taken_from_docker_ps(self) -> None:
        listing = "web nginx:1\nmain-db postgres:18\nother-db Postgres:17\n"
        instance = self.make({}, lambda n, c, i: runner.CommandResult(n, 0, listing, ""))
        self.assertEqual(instance._detect_postgres_container("docker"), "main-db")
        self.assertEqual(instance.command_runner.calls[0][1][:2], ["docker", "ps"])

    def test_no_postgres_container_is_an_error(self) -> None:
        instance = self.make({}, lambda n, c, i: runner.CommandResult(n, 0, "web nginx\n", ""))
        with self.assertRaisesRegex(RuntimeError, "No running PostgreSQL container"):
            instance._detect_postgres_container("docker")

    def test_docker_failure_is_an_error(self) -> None:
        instance = self.make({}, lambda n, c, i: runner.CommandResult(n, 1, "", "daemon down"))
        with self.assertRaisesRegex(RuntimeError, "Docker is not available"):
            instance._detect_postgres_container("docker")


class SqlSuiteTests(TempDirCase):
    def run_suite(self, answer=None):
        password = fake_value("pw")
        environment = {"ARSM_MCP_POSTGRES_CONNECTION_STRING": f"postgresql://reader:{password}@localhost:5432/db1",
                       "ARSM_SQL_TEST_CONTAINER": "box"}
        instance = runner.LocalTestRunner(self.tmp, self.tmp / "art", environment, runner.OutputSanitizer(self.tmp, []))
        instance.command_runner = RecordingRunner(answer)
        instance._required_executable = lambda name: name
        return instance._run_sql(), instance.command_runner.calls, password

    def test_every_sql_file_runs_through_psql_in_the_container(self) -> None:
        self.write("tests/Database/b-second.sql", "select 2;")
        self.write("tests/Database/a-first.sql", "select 1;")
        result, calls, password = self.run_suite()
        self.assertEqual((result.status, result.return_code, result.details["total"], result.details["failed"]), ("passed", 0, 2, 0))
        self.assertEqual([item["path"] for item in result.details["files"]],
                         ["tests/Database/a-first.sql", "tests/Database/b-second.sql"])
        name, command, cwd, _, input_text = calls[0]
        self.assertEqual(command[:5], ["docker", "exec", "-i", "-e", f"PGPASSWORD={password}"])
        self.assertEqual(command[5:], ["box", "psql", "-U", "reader", "-h", "localhost", "-d", "db1", "-v", "ON_ERROR_STOP=1", "-q", "-f", "-"])
        self.assertEqual((name, cwd, input_text), ("sql", self.tmp, "select 1;"))

    def test_a_failing_file_fails_the_suite_and_keeps_its_output_tail(self) -> None:
        self.write("tests/Database/ok.sql", "select 1;")
        self.write("tests/Database/bad.sql", "select broken;")
        answer = lambda n, c, i: runner.CommandResult(n, 3 if "broken" in i else 0, "", "ERROR: boom")  # noqa: E731
        result, _, _ = self.run_suite(answer)
        self.assertEqual((result.status, result.return_code, result.details["failed"]), ("failed", 1, 1))
        by_path = {item["path"]: item for item in result.details["files"]}
        self.assertEqual(by_path["tests/Database/bad.sql"]["outputTail"], ["ERROR: boom"])
        self.assertEqual(by_path["tests/Database/ok.sql"]["outputTail"], [])

    def test_no_sql_files_pass_with_zero_total(self) -> None:
        self.write("tests/Database/readme.md", "x")
        result, calls, _ = self.run_suite()
        self.assertEqual((result.status, result.details["total"], calls), ("passed", 0, []))


class MainTests(TempDirCase):
    def run_main(self, outcome, secret: str = "") -> tuple[int, str, list]:
        written: list = []

        class Loader:
            def __init__(self, root: Path) -> None:
                pass

            def load(self, environment: dict[str, str]) -> list[str]:
                return [secret] if secret else []

        class Local:
            def __init__(self, *args) -> None:  # noqa: ANN002
                pass

            def run_targets(self, targets):  # noqa: ANN001
                if isinstance(outcome, Exception):
                    raise outcome
                return outcome

        def write_report(root, artifacts, targets, results):  # noqa: ANN001
            written.append((list(targets), list(results)))
            return Path("tests/.artifacts/test-suite-summary.json")

        with mock.patch.multiple(runner, EnvironmentLoader=Loader, LocalTestRunner=Local, write_report=write_report):
            with captured() as (_, err):
                code = runner.main(["sql"])
        return code, err.getvalue(), written

    def test_passing_suites_exit_0(self) -> None:
        code, _, written = self.run_main([runner.SuiteResult("sql", "passed")])
        self.assertEqual((code, written[0][0]), (0, ["sql"]))

    def test_a_failed_suite_exits_1(self) -> None:
        self.assertEqual(self.run_main([runner.SuiteResult("sql", "failed", 1)])[0], 1)

    def test_a_runner_exception_becomes_a_sanitized_failed_result(self) -> None:
        secret = fake_value()
        code, err, written = self.run_main(RuntimeError(f"boom {secret}"), secret)
        self.assertEqual(code, 1)
        self.assertNotIn(secret, err)
        result = written[0][1][0]
        self.assertEqual((result.name, result.status), ("runner", "failed"))
        self.assertNotIn(secret, result.details["error"])
        self.assertIn("[FAILED] runner:", err)


if __name__ == "__main__":
    import unittest

    unittest.main()
