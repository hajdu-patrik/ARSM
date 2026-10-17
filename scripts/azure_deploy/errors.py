"""Exceptions that map to the exit codes of scripts/deploy-azure.py."""

from __future__ import annotations


class ConfigError(Exception):
    """Bad .env, missing tool or bad usage (exit code 2); the message never holds secret values."""


class StepFailure(Exception):
    """An external command or step failed (exit code 1); the message never holds secret values."""
