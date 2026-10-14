"""Git helpers that compare the working tree with the last pushed upstream."""

from __future__ import annotations

import subprocess

from .environment import ROOT


def _git(*args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(["git", *args], cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace", check=False)


def upstream_ref() -> str | None:
    """The tracking branch of HEAD, else origin/main, else None when neither exists."""
    tracking = _git("rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}")
    if tracking.returncode == 0 and tracking.stdout.strip():
        return tracking.stdout.strip()
    fallback = _git("rev-parse", "--verify", "--quiet", "origin/main")
    return "origin/main" if fallback.returncode == 0 else None


def path_differs(ref: str, path: str) -> bool:
    """True when `path` in the working tree differs from `ref`; any git error counts as a difference."""
    return _git("diff", "--quiet", ref, "--", path).returncode != 0
