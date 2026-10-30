"""Shared helpers of the scripts test suite: path setup, dashed-script loader, temp dirs, output capture."""

from __future__ import annotations

import importlib.util
import io
import shutil
import sys
import tempfile
import unittest
from contextlib import contextmanager, redirect_stderr, redirect_stdout
from pathlib import Path
from types import ModuleType
from typing import Iterator

ROOT = Path(__file__).resolve().parents[2]
SCRIPTS = ROOT / "scripts"
WEBUI = ROOT / "app" / "AutoService.WebUI"

# Scripts import their siblings (test_suite_secrets, prepush, azure_deploy) by plain name.
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

_LOADED: dict[str, ModuleType] = {}


def load_script(file_name: str, module_name: str) -> ModuleType:
    """Import scripts/<file_name> (dashed names are not importable) once and cache the module."""
    if module_name not in _LOADED:
        spec = importlib.util.spec_from_file_location(module_name, SCRIPTS / file_name)
        assert spec is not None and spec.loader is not None
        module = importlib.util.module_from_spec(spec)
        sys.modules[module_name] = module
        spec.loader.exec_module(module)
        _LOADED[module_name] = module
    return _LOADED[module_name]


class Stream(io.StringIO):
    """StringIO that also accepts reconfigure(), which the CLIs call on stdout and stderr."""

    def reconfigure(self, **_options: object) -> None:
        return None


@contextmanager
def captured() -> Iterator[tuple[Stream, Stream]]:
    """Capture stdout and stderr of the block."""
    out, err = Stream(), Stream()
    with redirect_stdout(out), redirect_stderr(err):
        yield out, err


class TempDirCase(unittest.TestCase):
    """Test case with a private temporary directory that is deleted afterwards."""

    def setUp(self) -> None:
        self.tmp = Path(tempfile.mkdtemp(prefix="arsm-scripts-test-"))
        self.addCleanup(shutil.rmtree, self.tmp, ignore_errors=True)

    def write(self, relative: str, text: str = "") -> Path:
        """Create a UTF-8 file with LF endings below the temp dir."""
        path = self.tmp / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8", newline="\n")
        return path
