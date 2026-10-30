"""azure_deploy.archive and azure_deploy.images: commit export and image commands (dry-run form, no docker or git)."""

from __future__ import annotations

import io
import shlex
import tarfile
import unittest
from pathlib import Path
from unittest import mock

from scriptsupport import TempDirCase, captured

from azure_deploy import archive, images
from azure_deploy.constants import DOCKERFILES, ROOT_DIR
from azure_deploy.errors import ConfigError, StepFailure
from azure_deploy.runner import CommandRunner
from azure_fixtures import FakeRunner, make_config

SHA = "0123456789abcdef" * 2 + "01234567"
TAG = SHA[:12]


def tar_bytes() -> bytes:
    buffer = io.BytesIO()
    with tarfile.open(fileobj=buffer, mode="w") as archive_file:
        info = tarfile.TarInfo("deploy/file.txt")
        info.size = 2
        archive_file.addfile(info, io.BytesIO(b"hi"))
    return buffer.getvalue()


class FakeGit:
    def __init__(self, payload: bytes, code: int = 0) -> None:
        self.stdout, self.returncode, self.killed = io.BytesIO(payload), code, False

    def kill(self) -> None:
        self.killed = True

    def wait(self) -> int:
        return self.returncode


class CommitTests(unittest.TestCase):
    def test_image_tag_is_the_first_twelve_characters(self) -> None:
        self.assertEqual(archive.image_tag(SHA), TAG)
        self.assertEqual(len(TAG), 12)

    def test_resolve_commit_asks_git_read_only_and_strips_the_answer(self) -> None:
        runner = FakeRunner(responses=lambda args: SHA + "\n")
        self.assertEqual(archive.resolve_commit(runner, "main"), SHA)
        call = runner.calls[0]
        self.assertEqual(call.args, ["git", "rev-parse", "--verify", "main^{commit}"])
        self.assertEqual((call.cwd, call.capture, call.read_only), (ROOT_DIR, True, True))

    def test_empty_or_option_like_refs_are_rejected_before_git_runs(self) -> None:
        for ref in ("", "--output=x", "-h"):
            runner = FakeRunner()
            with self.subTest(ref=ref), self.assertRaisesRegex(ConfigError, "must be a commit, branch or tag"):
                archive.resolve_commit(runner, ref)
            self.assertEqual(runner.calls, [])

    def test_unknown_ref_is_a_config_error_naming_the_ref(self) -> None:
        runner = FakeRunner(fail_when=lambda args: True)
        with self.assertRaisesRegex(ConfigError, "'nope' is not a known commit"):
            archive.resolve_commit(runner, "nope")


class ExportedCommitTests(TempDirCase):
    def test_dry_run_yields_a_placeholder_and_creates_nothing(self) -> None:
        runner = FakeRunner(dry_run=True)
        with mock.patch.object(archive.tempfile, "mkdtemp", side_effect=AssertionError("created")):
            with archive.exported_commit(runner, SHA) as path:
                self.assertEqual(path, Path("<temp-dir>"))
        self.assertTrue(runner.lines[0].startswith(f"[dry-run] git archive --format=tar {SHA}"))

    def test_the_temp_dir_holds_the_export_and_is_removed_afterwards(self) -> None:
        runner = FakeRunner()

        def fake_extract(sha: str, destination: Path) -> None:
            (destination / "marker.txt").write_text(sha, encoding="utf-8")

        with mock.patch.object(archive, "_extract", fake_extract):
            with archive.exported_commit(runner, SHA) as path:
                self.assertEqual((path / "marker.txt").read_text(encoding="utf-8"), SHA)
                self.assertTrue(path.name.startswith("arsm-deploy-"))
        self.assertFalse(path.exists())
        self.assertEqual(runner.lines[0], f"$ git archive --format=tar {SHA} | extract into a temp dir (removed afterwards)")

    def test_the_temp_dir_is_removed_when_the_body_or_the_extraction_fails(self) -> None:
        seen: list[Path] = []

        def failing_extract(sha: str, destination: Path) -> None:
            seen.append(destination)
            raise StepFailure("extract failed")

        with mock.patch.object(archive, "_extract", failing_extract):
            with self.assertRaises(StepFailure), archive.exported_commit(FakeRunner(), SHA):
                pass
        self.assertFalse(seen[0].exists())

        with mock.patch.object(archive, "_extract", lambda sha, destination: seen.append(destination)):
            with self.assertRaises(RuntimeError), archive.exported_commit(FakeRunner(), SHA):
                raise RuntimeError("body failed")
        self.assertFalse(seen[1].exists())

    def extract(self, process: FakeGit) -> None:
        with mock.patch.object(archive.subprocess, "Popen", return_value=process), mock.patch.object(archive.shutil, "which", return_value=None):
            archive._extract(SHA, self.tmp)

    def test_extract_unpacks_the_tar_stream(self) -> None:
        self.extract(FakeGit(tar_bytes()))
        self.assertEqual((self.tmp / "deploy" / "file.txt").read_bytes(), b"hi")

    def test_extract_reports_a_broken_stream_and_kills_git(self) -> None:
        process = FakeGit(b"this is not a tar stream")
        with self.assertRaisesRegex(StepFailure, r"Could not extract the git archive \(\w+\)\."):
            self.extract(process)
        self.assertTrue(process.killed)

    def test_extract_reports_a_failing_git_exit_code(self) -> None:
        with self.assertRaisesRegex(StepFailure, "git archive exited with code 128"):
            self.extract(FakeGit(tar_bytes(), code=128))


class ImageCommandTests(TempDirCase):
    def test_acr_login_uses_the_az_cli_without_a_password(self) -> None:
        runner = FakeRunner()
        images.acr_login(runner, make_config(self.tmp, ARSM_ACR_NAME="arsmimages1"))
        self.assertEqual(runner.calls[0].args, ["az", "acr", "login", "--name", "arsmimages1"])

    def test_dry_run_prints_login_archive_build_and_push_for_the_three_images(self) -> None:
        config = make_config(self.tmp, ARSM_ACR_NAME="arsmimages1", ARSM_PUBLIC_URL="https://app.example.test")
        runner = CommandRunner(config.masker, dry_run=True)
        with captured() as (out, _):
            returned = images.build_and_push(runner, config, SHA, TAG)
        refs = {kind: f"arsmimages1.azurecr.io/arsm-{kind}:{TAG}" for kind in ("api", "web", "gate")}
        self.assertEqual(returned, refs)
        expected = [f"Commit {SHA} -> image tag {TAG}", "[dry-run] az acr login --name arsmimages1",
                    f"[dry-run] git archive --format=tar {SHA} | extract into a temp dir (removed afterwards)"]
        for kind, ref in refs.items():
            build = ["docker", "build", "--file", DOCKERFILES[kind], "--tag", ref]
            if kind == "web":
                build += ["--build-arg", "PUBLIC_URL=https://app.example.test"]
            expected += ["[dry-run] " + shlex.join([*build, "."]), "[dry-run] " + shlex.join(["docker", "push", ref])]
        self.assertEqual(out.getvalue().splitlines(), expected)

    def test_only_the_web_image_gets_the_public_url_build_arg(self) -> None:
        runner = FakeRunner(dry_run=True)
        images.build_and_push(runner, make_config(self.tmp), SHA, TAG)
        builds = [call.args for call in runner.calls if call.args[:2] == ["docker", "build"]]
        self.assertEqual(len(builds), 3)
        self.assertEqual(["--build-arg" in args for args in builds], [False, True, False])

    def test_builds_run_inside_the_export_unless_dry_run(self) -> None:
        runner = FakeRunner()
        with mock.patch.object(images, "exported_commit") as export:
            export.return_value.__enter__.return_value = Path("/export")
            images.build_and_push(runner, make_config(self.tmp), SHA, TAG)
        builds = [call for call in runner.calls if call.args[:2] == ["docker", "build"]]
        self.assertTrue(all(call.cwd == Path("/export") for call in builds))
        pushes = [call for call in runner.calls if call.args[:2] == ["docker", "push"]]
        self.assertEqual(len(pushes), 3)

    def test_verify_checks_each_image_in_the_registry(self) -> None:
        runner = FakeRunner()
        images.verify_images_exist(runner, make_config(self.tmp, ARSM_ACR_NAME="arsmimages1"), TAG)
        self.assertEqual([call.args[-3] for call in runner.calls], [f"arsm-{kind}:{TAG}" for kind in ("api", "web", "gate")])
        self.assertTrue(all(call.capture for call in runner.calls))

    def test_a_missing_image_stops_the_check_with_a_pointer_to_the_images_step(self) -> None:
        runner = FakeRunner(fail_when=lambda args: f"arsm-web:{TAG}" in args)
        with self.assertRaisesRegex(StepFailure, f"Image arsm-web:{TAG} is not in the registry; run the images step"):
            images.verify_images_exist(runner, make_config(self.tmp), TAG)
        self.assertEqual(len(runner.calls), 2)


if __name__ == "__main__":
    unittest.main()
