"""prepush.frontend.needs_install: the npm ci decision compares package-lock.json with node_modules/.package-lock.json."""

from __future__ import annotations

import json
from unittest import mock

import scriptsupport  # noqa: F401  (puts scripts/ on sys.path)
from scriptsupport import TempDirCase
from prepush import frontend

PACKAGE = {"version": "1.0.0", "resolved": "https://registry.example.test/a-1.0.0.tgz", "integrity": "sha512-aaa"}


def lock_text(packages: dict[str, dict]) -> str:
    return json.dumps({"lockfileVersion": 3, "packages": {"": {"name": "app"}, **packages}})


class NeedsInstallTests(TempDirCase):
    def decide(self, lock: str | None, installed: str | None, modules: bool = True) -> tuple[bool, str]:
        said: list[str] = []
        if modules:
            (self.tmp / "node_modules").mkdir()
        if lock is not None:
            self.write("package-lock.json", lock)
        if installed is not None:
            self.write("node_modules/.package-lock.json", installed)
        ctx = mock.Mock(say=said.append)
        with mock.patch.object(frontend, "WEBUI", self.tmp):
            return frontend.needs_install(ctx), " ".join(said)

    def test_missing_node_modules_installs(self) -> None:
        self.assertTrue(self.decide(lock_text({}), None, modules=False)[0])

    def test_a_missing_hidden_lockfile_installs(self) -> None:
        self.assertTrue(self.decide(lock_text({"node_modules/a": PACKAGE}), None)[0])

    def test_matching_lockfiles_reuse_node_modules(self) -> None:
        text = lock_text({"node_modules/a": PACKAGE})
        self.assertFalse(self.decide(text, text)[0])

    def test_a_changed_version_installs(self) -> None:
        newer = {**PACKAGE, "version": "1.1.0"}
        self.assertTrue(self.decide(lock_text({"node_modules/a": newer}), lock_text({"node_modules/a": PACKAGE}))[0])

    def test_a_package_missing_from_node_modules_installs(self) -> None:
        self.assertTrue(self.decide(lock_text({"node_modules/a": PACKAGE}), lock_text({}))[0])

    def test_an_optional_platform_package_missing_from_node_modules_is_fine(self) -> None:
        optional = {**PACKAGE, "optional": True, "os": ["linux"]}
        lock = lock_text({"node_modules/a": PACKAGE, "node_modules/native": optional})
        self.assertFalse(self.decide(lock, lock_text({"node_modules/a": PACKAGE}))[0])

    def test_an_unreadable_lockfile_installs(self) -> None:
        self.assertTrue(self.decide("{not json", lock_text({}))[0])
