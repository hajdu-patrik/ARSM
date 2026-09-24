"""Secret loading and output masking shared by the local test runner and its sibling scripts."""

from __future__ import annotations

import re
from pathlib import Path
from typing import Iterable

SENSITIVE_NAME_PATTERN = re.compile(r"(?i)(password|passwd|secret|token|cookie|key|connection|pgpassword)")
POSTGRES_URI_PATTERN = re.compile(r"postgres(?:ql)?://[^\s\"']+", re.IGNORECASE)
ASSIGNMENT_SECRET_PATTERN = re.compile(
    r"(?i)\b(password|passwd|secret|token|authorization|cookie|connectionstring|pgpassword)\b([\s:=\"']+)([^\s,;]+)",
)
# JSON-shaped secrets need a rule of their own. The assignment pattern above
# stops at the first "," or ";", which leaves the rest of a multi-cookie
# header readable, and it only reaches a quoted field name now that quotes
# count as separators. This rule replaces the whole quoted value instead,
# and matches compound names too (accessToken, refreshToken, set-cookie).
JSON_SECRET_FIELD_PATTERN = re.compile(
    r"(?i)(\"[\w-]*(?:password|passwd|secret|token|authorization|cookie|connectionstring|pgpassword)[\w-]*\"\s*:\s*)"
    r"\"(?:[^\"\\]|\\.)*\"",
)
WINDOWS_ABSOLUTE_PATH_PATTERN = re.compile(r"[A-Za-z]:[\\/](?:[^\s\"'<>|:]+[\\/])*[^\s\"'<>|:]*")
UNIX_ABSOLUTE_PATH_PATTERN = re.compile(r"(?<![\w.])/[^\s\"']+(?:/[^\s\"']+)*")


class OutputSanitizer:
    """Masks local paths, loaded secret values, and credential-shaped output."""

    def __init__(self, root_dir: Path, secret_values: Iterable[str]) -> None:
        self.root_dir = root_dir.resolve()
        self.secret_values = sorted(
            {value for value in secret_values if value and len(value) >= 4},
            key=len,
            reverse=True,
        )

    def sanitize(self, text: str) -> str:
        """Return text safe to print or store in artifacts."""
        sanitized = text.replace(str(self.root_dir), "<repo>")
        sanitized = sanitized.replace(self.root_dir.as_posix(), "<repo>")

        for secret_value in self.secret_values:
            sanitized = sanitized.replace(secret_value, "<redacted>")

        sanitized = POSTGRES_URI_PATTERN.sub("postgresql://<redacted>", sanitized)
        sanitized = ASSIGNMENT_SECRET_PATTERN.sub(r"\1\2<redacted>", sanitized)
        # Runs after the assignment rule on purpose: that one stops at the
        # first "," or ";", so a multi-cookie header keeps a readable tail,
        # and this one then replaces the whole quoted value, closing quote
        # included.
        sanitized = JSON_SECRET_FIELD_PATTERN.sub(r'\1"<redacted>"', sanitized)
        sanitized = WINDOWS_ABSOLUTE_PATH_PATTERN.sub("<local-path>", sanitized)
        sanitized = UNIX_ABSOLUTE_PATH_PATTERN.sub(self._sanitize_unix_path, sanitized)
        return sanitized

    @staticmethod
    def _sanitize_unix_path(match: re.Match[str]) -> str:
        value = match.group(0)
        if value.startswith(("/api/", "/health", "/alive")):
            return value
        return "<local-path>"


class EnvironmentLoader:
    """Loads simple KEY=VALUE files without shell-specific behavior."""

    def __init__(self, root_dir: Path) -> None:
        self.root_dir = root_dir

    def load(self, environment: dict[str, str]) -> list[str]:
        """Load local test env files and return values that must be masked."""
        secret_values: list[str] = []
        for env_file in (self.root_dir / ".secrets", self.root_dir / "tests" / ".env"):
            secret_values.extend(self._load_file(env_file, environment))

        for key, value in environment.items():
            if SENSITIVE_NAME_PATTERN.search(key):
                secret_values.append(value)

        return secret_values

    @staticmethod
    def _load_file(env_file: Path, environment: dict[str, str]) -> list[str]:
        if not env_file.is_file():
            return []

        loaded_values: list[str] = []
        for raw_line in env_file.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue

            key, value = line.split("=", 1)
            key = key.strip().removeprefix("export ").strip()
            value = EnvironmentLoader._clean_value(value.strip())
            if not key:
                continue

            environment[key] = value
            loaded_values.append(value)

        return loaded_values

    @staticmethod
    def _clean_value(value: str) -> str:
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
            return value[1:-1]
        return value
