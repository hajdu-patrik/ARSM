"""arsm-chain path handling: the real workflow script runs under Node with stubbed agents (arsm_chain_harness.mjs)."""

from __future__ import annotations

import json
import shutil
import subprocess
import unittest
from pathlib import Path, PureWindowsPath
from typing import Any

HARNESS = Path(__file__).with_name("arsm_chain_harness.mjs")
REPO = "E:/Work/6. Félév/ARSM"
WEBUI_ROOT = "app/AutoService.WebUI"
UI_FILE = f"{WEBUI_ROOT}/src/features/scheduler/Intake.tsx"
API_ROOT = "app/AutoService.ApiService"


def backslashed(path: str) -> str:
    return str(PureWindowsPath(path))


def package(package_id: str, area: str, *owns: str) -> dict[str, Any]:
    return {"id": package_id, "area": area, "owns": list(owns)}


def run_chain(**scenario: Any) -> dict[str, Any]:
    """Run the workflow on a scenario, with the repository root known unless the scenario overrides it."""
    payload = json.dumps({"repoRoot": REPO, **scenario})
    done = subprocess.run(["node", str(HARNESS)], input=payload, capture_output=True, text=True, encoding="utf-8", check=False)
    if done.returncode:
        raise AssertionError(done.stderr)
    return json.loads(done.stdout)


def labels(report: dict[str, Any]) -> list[str]:
    return [call["label"] for call in report["calls"]]


@unittest.skipUnless(shutil.which("node"), "needs Node to run the workflow script")
class AbsolutePathTests(unittest.TestCase):
    def test_reported_spellings_keep_the_ui_audit_and_become_relative(self) -> None:
        spellings = {
            "relative": UI_FILE,
            "forward slashes": f"{REPO}/{UI_FILE}",
            "backslashes": backslashed(f"{REPO}/{UI_FILE}"),
            "lower-case drive": f"e{REPO[1:]}/{UI_FILE}",
            "git bash drive": f"/e{REPO[2:]}/{UI_FILE}",
        }
        for name, reported in spellings.items():
            with self.subTest(name):
                report = run_chain(packages=[package("fe", "frontend", WEBUI_ROOT)], files={"fe": [reported]})
                self.assertIn("ui-ux:fe", labels(report))
                self.assertEqual(report["changed"], [UI_FILE])

    def test_paths_outside_the_repository_stay_as_reported(self) -> None:
        outside = ["C:/Temp/Scratch.tsx", f"{REPO}-copy/{UI_FILE}"]
        report = run_chain(packages=[package("fe", "frontend", WEBUI_ROOT)], files={"fe": [UI_FILE, *outside]})
        self.assertEqual(report["changed"], [UI_FILE, *outside])

    def test_failures_reach_the_package_owning_an_absolute_path(self) -> None:
        report = run_chain(
            packages=[
                package("fe", "frontend", f"{REPO}/{WEBUI_ROOT}/src/features/scheduler"),
                package("be", "backend", f"{REPO}/{API_ROOT}"),
            ],
            files={"fe": [UI_FILE], "be": [f"{API_ROOT}/Program.cs"]},
            gateFailures=[
                {"stage": "frontend", "detail": ["src/features/scheduler/Intake.tsx(3,1): error TS2322"]},
                {"stage": "backend", "detail": [backslashed(f"{REPO}/{API_ROOT}/Program.cs") + "(1,1): error CS1002"]},
            ],
        )
        self.assertIn("fix:fe:1", labels(report))
        self.assertIn("fix:be:1", labels(report))
        self.assertFalse([label for label in labels(report) if label.startswith("fix:area-")])

    def test_test_persona_comes_from_an_absolute_owned_path(self) -> None:
        report = run_chain(packages=[package("api", "test", f"{REPO}/tests/API/Auth")])
        implementer = next(call for call in report["calls"] if call["label"] == "implement:api")
        self.assertEqual(implementer["agentType"], "http-endpoint-test")


@unittest.skipUnless(shutil.which("node"), "needs Node to run the workflow script")
class SkippedAuditTests(unittest.TestCase):
    def test_unknown_root_flags_the_skipped_audit(self) -> None:
        report = run_chain(packages=[package("fe", "frontend", WEBUI_ROOT)], files={"fe": [f"{REPO}/{UI_FILE}"]}, repoRoot=None)
        self.assertNotIn("ui-ux:fe", labels(report))
        self.assertTrue(report["auditSkipped"][0])
        self.assertTrue(any(line.startswith("Repository root unknown") for line in report["logs"]))
        self.assertTrue(any("ui-ux audit skipped" in line for line in report["logs"]))

    def test_backend_package_in_a_ui_run_is_not_flagged(self) -> None:
        report = run_chain(
            packages=[package("be", "backend", API_ROOT), package("fe", "frontend", WEBUI_ROOT)],
            files={"be": [f"{API_ROOT}/Program.cs"], "fe": [UI_FILE]},
        )
        self.assertEqual(report["auditSkipped"], [None, None])


@unittest.skipUnless(shutil.which("node"), "needs Node to run the workflow script")
class ProofSuiteSelectionTests(unittest.TestCase):
    def test_a_backslashed_proof_file_still_selects_its_suite(self) -> None:
        cases = {
            "tests/API/Auth/refresh.http": "test:api",
            "tests/Database/quotes.sql": "test:api",
            "tests/AutoService.UnitTests/QuoteTests.cs": "test:unit",
            f"{WEBUI_ROOT}/tests/e2e/intake.spec.ts": "test:e2e",
        }
        bug = {"summary": "found by the run", "fixedIn": [UI_FILE]}
        for proof_file, suite in cases.items():
            for spelling in (proof_file, backslashed(proof_file), backslashed(f"{REPO}/{proof_file}")):
                with self.subTest(spelling):
                    report = run_chain(
                        packages=[package("fe", "frontend", WEBUI_ROOT)],
                        files={"fe": [UI_FILE]},
                        bugsFound=[bug],
                        proofFile=spelling,
                    )
                    self.assertIn(suite, labels(report))


if __name__ == "__main__":
    unittest.main()
