#!/usr/bin/env python3
"""Refresh the generated model-policy table in the root CLAUDE.md.

Queries the Anthropic Models API for the newest Sonnet, Opus and Fable model and the effort levels
each one supports, then rewrites the block between the model-policy markers in CLAUDE.md. The file
is only written when the rendered block differs, so an unchanged catalog leaves the tree clean.

The tier rules (which effort to use, what the family is for, whether it needs approval) are the
repository owner's policy and live in FAMILY_POLICIES below; only the model id and the supported
effort levels come from the API.

Credentials: the SDK reads ANTHROPIC_API_KEY from the environment. The key is never printed.

Exit codes: 0 success (changed or unchanged), 1 configuration or API error, 2 policy check failure
(a family has no model, or its policy effort level is not supported by the newest model).
"""

from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Iterable, Mapping

ROOT_DIR = Path(__file__).resolve().parent.parent
DEFAULT_CLAUDE_MD = ROOT_DIR / "CLAUDE.md"
START_MARKER = "<!-- model-policy:start -->"
END_MARKER = "<!-- model-policy:end -->"
EFFORT_ORDER = ("low", "medium", "high", "xhigh", "max")


@dataclass(frozen=True)
class FamilyPolicy:
    family: str
    label: str
    efforts: tuple[str, ...]
    use_for: str
    approval: str


FAMILY_POLICIES = (
    FamilyPolicy("sonnet", "Sonnet", ("max",), "easy and medium tasks (default)", "not needed"),
    FamilyPolicy("opus", "Opus", ("xhigh", "max"), "serious tasks", "not needed"),
    FamilyPolicy("fable", "Fable", ("high",), "only very extreme tasks", "ask the user first"),
)


@dataclass(frozen=True)
class ModelInfo:
    model_id: str
    created_at: datetime
    efforts: tuple[str, ...]


class PolicyError(Exception):
    """Raised when the API catalog cannot satisfy the owner's tier policy."""


def supported_efforts(capabilities: Mapping[str, object] | None) -> tuple[str, ...]:
    """Return the supported effort levels, in ladder order, from a Models API capability tree."""
    effort = (capabilities or {}).get("effort")
    if not isinstance(effort, Mapping) or not _is_supported(effort):
        return ()
    return tuple(level for level in EFFORT_ORDER if _is_supported(effort.get(level)))


def _is_supported(node: object) -> bool:
    return isinstance(node, Mapping) and node.get("supported") is True


def newest_by_family(models: Iterable[ModelInfo]) -> dict[str, ModelInfo]:
    """Pick the most recently created model per policy family (for example `claude-opus-*`)."""
    newest: dict[str, ModelInfo] = {}
    for model in models:
        match = re.match(r"^claude-([a-z]+)-\d", model.model_id)
        if match is None:
            continue
        family = match.group(1)
        current = newest.get(family)
        if current is None or model.created_at > current.created_at:
            newest[family] = model
    return newest


def render_block(newest: Mapping[str, ModelInfo]) -> str:
    """Render the marker-delimited table, failing if a family is missing or cannot run its effort."""
    rows = []
    for policy in FAMILY_POLICIES:
        model = newest.get(policy.family)
        if model is None:
            raise PolicyError(f"The Models API returned no {policy.label} model.")
        missing = [level for level in policy.efforts if level not in model.efforts]
        if missing:
            raise PolicyError(f"{model.model_id} does not support the policy effort level(s): {', '.join(missing)}.")
        effort = "–".join(f"`{level}`" for level in policy.efforts)
        supported = ", ".join(model.efforts)
        rows.append(f"| {policy.label} | `{model.model_id}` | {effort} | {policy.use_for} | {policy.approval} | {supported} |")

    return "\n".join([
        START_MARKER,
        "<!-- Generated daily by scripts/update-model-policy.py (.github/workflows/model-policy.yml). Do not edit by hand. -->",
        "| Family | Latest model | Effort to use | Use for | Approval | Supported effort (Models API) |",
        "|---|---|---|---|---|---|",
        *rows,
        END_MARKER,
    ])


def replace_block(text: str, block: str) -> str:
    """Swap the existing marker-delimited block for the freshly rendered one."""
    pattern = re.compile(re.escape(START_MARKER) + r".*?" + re.escape(END_MARKER), re.DOTALL)
    if pattern.search(text) is None:
        raise PolicyError("CLAUDE.md has no model-policy markers to replace.")
    return pattern.sub(lambda _: block, text, count=1)


def fetch_models() -> list[ModelInfo]:
    """List every model visible to the API key through the official SDK (auto-paginates)."""
    from anthropic import Anthropic

    client = Anthropic()
    return [
        ModelInfo(model.id, model.created_at, supported_efforts(getattr(model, "capabilities", None)))
        for model in client.models.list()
    ]


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Refresh the model-policy table in CLAUDE.md from the Models API.")
    parser.add_argument("--claude-md", type=Path, default=DEFAULT_CLAUDE_MD, help="CLAUDE.md to update (default: repo root).")
    parser.add_argument("--dry-run", action="store_true", help="Print the rendered block instead of writing the file.")
    return parser.parse_args(argv)


def main(argv: list[str]) -> int:
    args = parse_args(argv)
    try:
        block = render_block(newest_by_family(fetch_models()))
        if args.dry_run:
            print(block)
            return 0
        with args.claude_md.open(encoding="utf-8", newline="") as handle:
            original = handle.read()
        newline = "\r\n" if "\r\n" in original else "\n"
        updated = replace_block(original, block.replace("\n", newline))
    except PolicyError as error:
        print(f"Model policy check failed: {error}", file=sys.stderr)
        return 2
    except Exception as error:  # SDK, network or file errors: report the type only, never payloads.
        print(f"Model policy refresh failed: {type(error).__name__}.", file=sys.stderr)
        return 1

    if updated == original:
        print("Model policy unchanged.")
        return 0
    with args.claude_md.open("w", encoding="utf-8", newline="") as handle:
        handle.write(updated)
    print("Model policy updated.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
