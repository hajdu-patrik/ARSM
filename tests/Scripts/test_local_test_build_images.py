"""deploy/local-test/deploy.py: the test instance images are built from the deployed commit only."""

from __future__ import annotations

import importlib.util
import io
import sys
import tarfile
import tempfile
import unittest
from pathlib import Path

from scriptsupport import ROOT

_SPEC = importlib.util.spec_from_file_location("local_test_deploy_under_test", ROOT / "deploy" / "local-test" / "deploy.py")
assert _SPEC is not None and _SPEC.loader is not None
deploy = importlib.util.module_from_spec(_SPEC)
sys.modules[_SPEC.name] = deploy
_SPEC.loader.exec_module(deploy)

DOCKERFILE = "deploy/web.Dockerfile"
SHA = "a" * 40
COMMITTED = {DOCKERFILE: "FROM committed\n", "deploy/api.Dockerfile": "FROM api\n"}


class BuildImagesTests(unittest.TestCase):
    """git and tar are faked from COMMITTED; the clone's working tree holds an older deploy/ file."""

    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.repo = Path(self._tmp.name)
        (self.repo / "deploy").mkdir()
        (self.repo / DOCKERFILE).write_text("FROM stale\n", encoding="utf-8")
        (self.repo / ".dockerignore").write_text("*\n!deploy\n", encoding="utf-8")
        self.builds: list[dict[str, str]] = []
        self._real_run = deploy.run
        deploy.run = self._fake_run

    def tearDown(self) -> None:
        deploy.run = self._real_run
        self._tmp.cleanup()

    def _fake_run(self, args, **kwargs):
        if args[0] == "git" and "archive" in args:
            self.assertEqual(args[-1], SHA)
            with tarfile.open(args[args.index("-o") + 1], "w") as archive:
                for name, text in COMMITTED.items():
                    data = text.encode("utf-8")
                    info = tarfile.TarInfo(name)
                    info.size = len(data)
                    archive.addfile(info, io.BytesIO(data))
        elif args[0] == "tar":
            with tarfile.open(args[2]) as archive:
                archive.extractall(args[4], filter="data")
        elif args[0] == "docker":
            context = Path(kwargs["cwd"])
            self.builds.append({name: (context / name).read_text(encoding="utf-8") for name in (DOCKERFILE, ".dockerignore")})
        else:
            self.fail(f"unexpected command {args[0]}")
        return ""

    def test_builds_the_committed_deploy_files_not_the_working_tree(self) -> None:
        deploy.build_images(self.repo, SHA, "https://teszt.example.test")

        self.assertEqual(len(self.builds), 2)
        for build in self.builds:
            self.assertEqual(build[DOCKERFILE], "FROM committed\n")

    def test_keeps_the_local_dockerignore_allow_list(self) -> None:
        deploy.build_images(self.repo, SHA, "https://teszt.example.test")

        for build in self.builds:
            self.assertEqual(build[".dockerignore"], "*\n!deploy\n")


if __name__ == "__main__":
    unittest.main()
