"""Command line of the production deploy: subcommands, confirmation, exit codes."""

from __future__ import annotations

import argparse
import sys
from typing import Sequence

from . import steps
from .archive import image_tag, resolve_commit
from .checks import run_check
from .config import DeployConfig, load_config
from .constants import EXIT_BAD_CONFIG, EXIT_OK, EXIT_STEP_FAILED
from .errors import ConfigError, StepFailure
from .images import build_and_push
from .runner import CommandRunner

SUBCOMMANDS = {
    "check": "Validate the .env keys and the az/docker/git tools; prints key names with ok/missing only.",
    "registry": "Select the subscription, ensure the resource group, deploy registry.bicep (ACR Basic), az acr login.",
    "images": "Build arsm-api, arsm-web (PUBLIC_URL build arg) and arsm-gate from a git archive of --commit; push them.",
    "infra": "Deploy main.bicep with main.bicepparam (secrets via the az process environment); print the outputs.",
    "dns": "Print the static IP, the asuid verification id and the exact Cloudflare records (DNS only).",
    "bind-domain": "Add the custom hostname to arsm-web and bind a managed certificate (HTTP validation).",
    "release": "registry + images + infra + dns in one go (asks once unless --yes).",
}
EPILOG = (
    "Subcommands:\n"
    + "\n".join(f"  {name:<12}{text}" for name, text in SUBCOMMANDS.items())
    + "\n\nExit codes: 0 ok, 1 a step failed, 2 bad config or usage.\n"
    "Secret values are never printed; az receives them only through its process environment.\n"
    "Nothing in this script deletes Azure resources."
)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="deploy-azure.py",
        description="Production deploy of the AutoService app to Azure, run locally from the root .env.",
        epilog=EPILOG,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("subcommand", choices=list(SUBCOMMANDS), metavar="subcommand", help="One of: " + ", ".join(SUBCOMMANDS) + ".")
    parser.add_argument("--commit", default="HEAD", metavar="REF", help="Commit to build and deploy (default HEAD); the image tag is its first 12 sha characters.")
    parser.add_argument("--dry-run", action="store_true", help="Print the commands (secrets masked) without running az or docker.")
    parser.add_argument("--yes", action="store_true", help="Skip the confirmation of images, infra and release.")
    return parser


def confirm(runner: CommandRunner, question: str, assume_yes: bool) -> None:
    """Ask before a costly step; non-interactive runs need --yes. Dry-run never asks."""
    if assume_yes or runner.dry_run:
        return
    if not sys.stdin.isatty():
        raise ConfigError("Confirmation needed but stdin is not interactive; pass --yes.")
    if input(f"{question} [y/N] ").strip().lower() not in {"y", "yes"}:
        raise StepFailure("Cancelled by the user.")


def dispatch(args: argparse.Namespace, config: DeployConfig, runner: CommandRunner) -> None:
    """Run the selected subcommand."""
    name = args.subcommand
    if name == "dns":
        return steps.dns(runner, config)
    if name == "bind-domain":
        return steps.bind_domain(runner, config)
    commit_sha = resolve_commit(runner, args.commit)
    tag = image_tag(commit_sha)
    target = f"commit {tag} to resource group {config.resource_group}"
    if name == "registry":
        steps.registry(runner, config, commit_sha)
    elif name == "images":
        confirm(runner, f"Build and push 3 images of {target} ({config.registry_host})?", args.yes)
        build_and_push(runner, config, commit_sha, tag)
    elif name == "infra":
        confirm(runner, f"Deploy {target}?", args.yes)
        steps.infra(runner, config, commit_sha, tag)
    elif name == "release":
        confirm(runner, f"Run registry, images and infra for {target}?", args.yes)
        steps.registry(runner, config, commit_sha)
        build_and_push(runner, config, commit_sha, tag)
        outputs = steps.infra(runner, config, commit_sha, tag)
        steps.dns(runner, config, outputs)


def main(argv: Sequence[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    for stream in (sys.stdout, sys.stderr):
        stream.reconfigure(errors="replace")
    try:
        if args.subcommand == "check":
            run_check()
            return EXIT_OK
        config = load_config()
        dispatch(args, config, CommandRunner(config.masker, args.dry_run))
        return EXIT_OK
    except ConfigError as error:
        print(f"[CONFIG] {error}", file=sys.stderr)
        return EXIT_BAD_CONFIG
    except StepFailure as error:
        print(f"[FAIL] {error}", file=sys.stderr)
        return EXIT_STEP_FAILED
    except KeyboardInterrupt:
        print("[FAIL] Interrupted; temp files were removed.", file=sys.stderr)
        return EXIT_STEP_FAILED
