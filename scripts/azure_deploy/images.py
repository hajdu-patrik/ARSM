"""Builds and pushes the api, web and gate images from a clean git archive of one commit."""

from __future__ import annotations

from .archive import exported_commit
from .config import DeployConfig
from .constants import DOCKERFILES
from .errors import StepFailure
from .runner import CommandRunner


def acr_login(runner: CommandRunner, config: DeployConfig) -> None:
    """Log docker in to the registry through the az CLI (no password on any command line)."""
    runner.run(["az", "acr", "login", "--name", config.acr_name])


def build_and_push(runner: CommandRunner, config: DeployConfig, commit_sha: str, tag: str) -> dict[str, str]:
    """Build and push arsm-api, arsm-web and arsm-gate tagged with the commit; returns the image references."""
    images = config.image_names(tag)
    runner.say(f"Commit {commit_sha} -> image tag {tag}")
    acr_login(runner, config)
    with exported_commit(runner, commit_sha) as context:
        for kind, reference in images.items():
            command = ["docker", "build", "--file", DOCKERFILES[kind], "--tag", reference]
            if kind == "web":
                command += ["--build-arg", f"PUBLIC_URL={config.public_url}"]
            command.append(".")
            runner.run(command, cwd=None if runner.dry_run else context)
            runner.run(["docker", "push", reference])
    return images


def verify_images_exist(runner: CommandRunner, config: DeployConfig, tag: str) -> None:
    """Fail early when a tagged image is missing from the registry."""
    for kind in ("api", "web", "gate"):
        try:
            runner.run(
                ["az", "acr", "repository", "show", "--name", config.acr_name, "--image", f"arsm-{kind}:{tag}", "--output", "none"],
                capture=True,
            )
        except StepFailure as error:
            raise StepFailure(f"Image arsm-{kind}:{tag} is not in the registry; run the images step for this commit first.") from error
