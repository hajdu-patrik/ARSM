#!/usr/bin/env python3
"""Tell the CI workflows which heavy jobs the diff needs; see scripts/CLAUDE.md for the rules and usage."""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
GROUPS = ("webui", "backend", "api_suites")

# Paths no heavy job reads; repo-gate still runs on every push.
NO_JOB_PREFIXES = ("docs/", "deploy/", ".claude/", ".vscode/", ".githooks/", "tests/Scripts/")
NO_JOB_FILES = {".actrc", ".env.example", ".secrets.example", ".gitignore"}
# First match wins, so the WebUI rule has to stay ahead of the wider app/ rule.
PREFIX_GROUPS: tuple[tuple[str, frozenset[str]], ...] = (
    ("app/AutoService.WebUI/", frozenset({"webui"})),
    ("app/", frozenset({"backend", "api_suites"})),
    ("dotnet-tools.json", frozenset({"backend"})),
    ("tests/AutoService.UnitTests/", frozenset({"backend"})),
    ("tests/API/", frozenset({"api_suites"})),
    ("tests/Database/", frozenset({"api_suites"})),
    ("scripts/", frozenset({"api_suites"})),
)


def groups_for(path: str) -> frozenset[str]:
    """The job groups one changed path needs; a path without a rule needs all of them."""
    if path.endswith(".md") or path in NO_JOB_FILES or path.startswith(NO_JOB_PREFIXES):
        return frozenset()
    return next((groups for prefix, groups in PREFIX_GROUPS if path.startswith(prefix)), frozenset(GROUPS))


def select_groups(files: list[str]) -> set[str]:
    """Union of the job groups the changed files need."""
    return {group for path in files for group in groups_for(path)}


def changed_files(base: str) -> list[str] | None:
    """Paths changed from `base` to HEAD, or None when git cannot tell (unknown or missing base)."""
    if not base:
        return None
    # Without rename detection git never reads a blob, so a blobless CI clone is enough.
    command = ["git", "diff", "--name-only", "--no-renames", base, "HEAD"]
    completed = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, encoding="utf-8", check=False)
    return completed.stdout.splitlines() if completed.returncode == 0 else None


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Print the CI job groups the diff needs as GITHUB_OUTPUT lines.")
    parser.add_argument("--base", default="", help="Last commit this workflow passed on; empty runs every job.")
    args = parser.parse_args(argv)
    files = changed_files(args.base)
    selected = set(GROUPS) if files is None else select_groups(files)
    for group in GROUPS:
        print(f"{group}={'true' if group in selected else 'false'}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
