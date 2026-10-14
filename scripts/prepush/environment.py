"""Pre-push context: local secrets, the sanitizer and the reused test-runner module."""

from __future__ import annotations

import importlib.util
import os
import sys
from dataclasses import dataclass
from pathlib import Path
from types import ModuleType
from typing import Any

from test_suite_secrets import EnvironmentLoader, OutputSanitizer

from .constants import DEFAULT_COMMAND_TIMEOUT_SECONDS, DEFAULT_VALIDATE_TIMEOUT_SECONDS
from .credentials import InfraCredentials

ROOT = Path(__file__).resolve().parents[2]
SCRIPTS = ROOT / "scripts"
APP = ROOT / "app"
WEBUI = APP / "AutoService.WebUI"
API_PROJECT_DIR = APP / "AutoService.ApiService"
ARTIFACTS = ROOT / "tests" / ".artifacts"


@dataclass
class Context:
    """Everything a stage needs; commands run through `runner`, so output is always sanitized."""

    runner_module: ModuleType
    environment: dict[str, str]
    sanitizer: OutputSanitizer
    runner: Any
    credentials: InfraCredentials

    def say(self, text: str) -> None:
        print(self.sanitizer.sanitize(text), flush=True)


def load_runner_module() -> ModuleType:
    """Import the dashed run-local-test-suite.py so its runner is reused, not copied."""
    path = SCRIPTS / "run-local-test-suite.py"
    spec = importlib.util.spec_from_file_location("run_local_test_suite", path)
    if spec is None or spec.loader is None:
        raise RuntimeError("scripts/run-local-test-suite.py cannot be imported.")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def build_context() -> Context:
    """Load .secrets and tests/.env the way the test runner does and prepare the sanitizer."""
    runner_module = load_runner_module()
    environment = os.environ.copy()
    secret_values = EnvironmentLoader(ROOT).load(environment)
    credentials = InfraCredentials.generate()
    sanitizer = OutputSanitizer(ROOT, [*secret_values, *credentials.values()])
    environment.setdefault("ARSM_TEST_COMMAND_TIMEOUT_SECONDS", DEFAULT_COMMAND_TIMEOUT_SECONDS)
    environment.setdefault("ARSM_VALIDATE_TIMEOUT_SECONDS", DEFAULT_VALIDATE_TIMEOUT_SECONDS)
    return Context(runner_module, environment, sanitizer, runner_module.CommandRunner(sanitizer), credentials)
