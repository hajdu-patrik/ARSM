"""Subprocess runner for az, docker and git: masked output, dry-run mode, secrets only via the environment."""

from __future__ import annotations

import os
import shlex
import shutil
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Mapping, Sequence

from .errors import StepFailure
from .masking import SecretMasker


@dataclass(frozen=True)
class CommandResult:
    """Captured stdout of a finished command."""

    stdout: str


class CommandRunner:
    """Runs external tools; every printed line passes the masker, and dry-run only prints."""

    def __init__(self, masker: SecretMasker, dry_run: bool = False) -> None:
        self.masker = masker
        self.dry_run = dry_run

    def say(self, message: str = "") -> None:
        """Print a masked line to stdout."""
        print(self.masker.mask(message), flush=True)

    def run(
        self,
        args: Sequence[str],
        *,
        env_extra: Mapping[str, str] | None = None,
        cwd: Path | None = None,
        capture: bool = False,
        read_only: bool = False,
    ) -> CommandResult:
        """Run a command; env_extra reaches only this child. read_only commands also run in dry-run."""
        self._announce(args, env_extra)
        if self.dry_run and not read_only:
            return CommandResult("")
        command = [shutil.which(args[0]) or args[0], *args[1:]]
        environment = {**os.environ, **(env_extra or {})}
        try:
            if capture:
                return self._run_captured(command, environment, cwd)
            return self._run_streamed(command, environment, cwd)
        except FileNotFoundError as error:
            raise StepFailure(f"{args[0]} is not installed or not on PATH.") from error

    def _announce(self, args: Sequence[str], env_extra: Mapping[str, str] | None) -> None:
        prefix = "[dry-run] " if self.dry_run else "$ "
        self.say(prefix + shlex.join(args))
        if env_extra and self.dry_run:
            self.say(f"          env passed to the child only: {', '.join(sorted(env_extra))} (values hidden)")

    def _run_streamed(self, command: list[str], environment: dict[str, str], cwd: Path | None) -> CommandResult:
        process = subprocess.Popen(
            command, cwd=cwd, env=environment, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
            text=True, encoding="utf-8", errors="replace",
        )
        assert process.stdout is not None
        for line in process.stdout:
            self.say(line.rstrip())
        self._check(process.wait(), command[0])
        return CommandResult("")

    def _run_captured(self, command: list[str], environment: dict[str, str], cwd: Path | None) -> CommandResult:
        completed = subprocess.run(
            command, cwd=cwd, env=environment, capture_output=True, text=True, encoding="utf-8", errors="replace",
        )
        for line in completed.stderr.splitlines():
            print(self.masker.mask(line), file=sys.stderr, flush=True)
        self._check(completed.returncode, command[0])
        return CommandResult(completed.stdout)

    @staticmethod
    def _check(returncode: int, tool: str) -> None:
        if returncode != 0:
            name = Path(tool).stem
            raise StepFailure(f"{name} exited with code {returncode}.")
