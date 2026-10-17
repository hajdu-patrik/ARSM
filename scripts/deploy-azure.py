#!/usr/bin/env python3
"""Production deploy to Azure; subcommands, flags and exit codes are in --help and scripts/CLAUDE.md."""

from __future__ import annotations

import sys
from pathlib import Path

# Put scripts/ first so `azure_deploy` and test_suite_secrets import cleanly.
sys.path.insert(0, str(Path(__file__).resolve().parent))

from azure_deploy.cli import main  # noqa: E402

if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
