"""Reads enum member names from the C# domain files so the script validates against the API's own names."""

from __future__ import annotations

import re
from pathlib import Path

from .constants import UNIQUE_TYPES_DIR
from .errors import ConfigError

_MEMBER_PATTERN = re.compile(r"^\s*([A-Za-z_]\w*)\s*(?:=\s*[^,/]+)?\s*,?\s*(?://.*)?$")


def read_enum_names(enum_name: str, directory: Path = UNIQUE_TYPES_DIR) -> list[str]:
    """Member names of `public enum <enum_name>` from <directory>/<enum_name>.cs."""
    source = directory / f"{enum_name}.cs"
    if not source.is_file():
        raise ConfigError(f"Enum source {source.name} not found; cannot validate {enum_name} values.")
    text = source.read_text(encoding="utf-8-sig")
    body = re.search(r"enum\s+" + re.escape(enum_name) + r"\s*\{(.*?)\}", text, re.DOTALL)
    if body is None:
        raise ConfigError(f"Enum {enum_name} not found in {source.name}.")
    names = []
    for line in body.group(1).splitlines():
        match = _MEMBER_PATTERN.match(line)
        if match:
            names.append(match.group(1))
    if not names:
        raise ConfigError(f"Enum {enum_name} in {source.name} has no readable members.")
    return names
