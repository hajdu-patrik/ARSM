"""Exports a clean `git archive` of one commit into a temp dir that is always removed afterwards."""

from __future__ import annotations

import shutil
import stat
import subprocess
import tarfile
import tempfile
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

from .constants import ROOT_DIR, TAG_LENGTH
from .errors import ConfigError, StepFailure
from .runner import CommandRunner

DRY_RUN_DIR = Path("<temp-dir>")


def resolve_commit(runner: CommandRunner, ref: str) -> str:
    """Full commit sha of a ref (read-only, also runs in dry-run)."""
    if not ref or ref.startswith("-"):
        raise ConfigError("--commit must be a commit, branch or tag name.")
    try:
        result = runner.run(["git", "rev-parse", "--verify", f"{ref}^{{commit}}"], cwd=ROOT_DIR, capture=True, read_only=True)
    except StepFailure as error:
        raise ConfigError(f"--commit {ref!r} is not a known commit.") from error
    return result.stdout.strip()


def image_tag(commit_sha: str) -> str:
    """The 12-character image tag of a commit sha."""
    return commit_sha[:TAG_LENGTH]


def _make_writable(function, path, _error) -> None:  # noqa: ANN001
    """Clear the read-only bit (git objects on Windows) and retry the failed removal."""
    Path(path).chmod(stat.S_IWRITE)
    function(path)


@contextmanager
def exported_commit(runner: CommandRunner, commit_sha: str) -> Iterator[Path]:
    """Yield a temp dir holding `git archive <commit>`; the dir is deleted in a finally block."""
    if runner.dry_run:
        runner.say(f"[dry-run] git archive --format=tar {commit_sha} | extract into a temp dir (removed afterwards)")
        yield DRY_RUN_DIR
        return
    temp_dir = Path(tempfile.mkdtemp(prefix="arsm-deploy-"))
    try:
        runner.say(f"$ git archive --format=tar {commit_sha} | extract into a temp dir (removed afterwards)")
        _extract(commit_sha, temp_dir)
        yield temp_dir
    finally:
        shutil.rmtree(temp_dir, onexc=_make_writable)


def _extract(commit_sha: str, destination: Path) -> None:
    git = shutil.which("git") or "git"
    process = subprocess.Popen([git, "archive", "--format=tar", commit_sha], cwd=ROOT_DIR, stdout=subprocess.PIPE)
    assert process.stdout is not None
    try:
        with tarfile.open(fileobj=process.stdout, mode="r|") as archive:
            archive.extractall(destination, filter="data")
    except (tarfile.TarError, OSError) as error:
        process.kill()
        raise StepFailure(f"Could not extract the git archive ({type(error).__name__}).") from error
    finally:
        process.stdout.close()
        process.wait()
    if process.returncode != 0:
        raise StepFailure(f"git archive exited with code {process.returncode}.")
