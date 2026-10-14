#!/usr/bin/env python3
"""Mandatory local pre-push gate; stages and options are documented in scripts/CLAUDE.md."""

from __future__ import annotations

import sys
from pathlib import Path

# Put scripts/ first so `prepush` and the sibling modules (test_suite_secrets, ...) import cleanly.
sys.path.insert(0, str(Path(__file__).resolve().parent))

from prepush.cli import main  # noqa: E402

if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
