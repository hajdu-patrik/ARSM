#!/usr/bin/env python3
"""Deterministic validation gate for ARSM changes (replaces the LLM `validate` agent).

Runs, scoped to the changed files by default:
  frontend  - `tsc -b --noEmit` and eslint on the changed WebUI files (when WebUI changed)
  backend   - `dotnet build` of the solution (when a backend project changed)
  size      - file size guardrails: source > 500 lines, test > 250 lines, C# type > 300 lines
  shadows   - the WebUI clean-design invariant: no `shadow-*`, `box-shadow`, `transition-shadow`
  security  - `npm audit fix` + `npm audit`, and `dotnet list package --vulnerable`, only when a
              package manifest or lockfile changed (or with --security)

Usage: python scripts/validate.py [--all] [--base REF] [--security] [--skip-build] [--json]
Exit codes: 0 every stage passed or skipped, 1 a stage failed, 2 usage or git error.
Report: tests/.artifacts/validate-summary.json (stage status and short failure tails, no secrets).
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Callable, Sequence

ROOT = Path(__file__).resolve().parent.parent
APP = ROOT / "app"
WEBUI = APP / "AutoService.WebUI"
WEBUI_PREFIX = "app/AutoService.WebUI/"
BACKEND_PREFIXES = ("app/AutoService.ApiService/", "app/AutoService.AppHost/", "app/AutoService.ServiceDefaults/")
BACKEND_ROOT_FILES = ("app/AutoService.slnx", "app/Directory.Build.props", "app/nuget.config")
REPORT = ROOT / "tests" / ".artifacts" / "validate-summary.json"
TIMEOUT = int(os.environ.get("ARSM_VALIDATE_TIMEOUT_SECONDS", "300"))

SOURCE_SUFFIXES = (".cs", ".ts", ".tsx", ".js", ".mjs", ".py")
SOURCE_LIMIT, TEST_LIMIT, CSHARP_TYPE_LIMIT = 500, 250, 300
GENERATED_MARKERS = ("/Migrations/", "/node_modules/", "/dist/", "/bin/", "/obj/", ".Designer.cs", "ModelSnapshot.cs")
SHADOW_PATTERN = re.compile(
    r"box-shadow|transition-shadow|(?:^|[\s\"'`:])(?:dark:)?shadow(?:-[\w/\[\].-]+)?(?=[\s\"'`]|$)")
CSHARP_TYPE_PATTERN = re.compile(r"^\s*(?:[\w<>\[\],]+\s+)*(?:class|record|struct|interface)\s+(\w+)")
FRONTEND_MANIFESTS = ("app/AutoService.WebUI/package.json", "app/AutoService.WebUI/package-lock.json")
BACKEND_MANIFEST_PATTERN = re.compile(r"(\.csproj|Directory\.Packages\.props|packages\.lock\.json|Directory\.Build\.props)$")


@dataclass
class StageResult:
    name: str
    status: str = "SKIP"
    detail: list[str] = field(default_factory=list)


def git_lines(*args: str) -> list[str]:
    completed = subprocess.run(["git", *args], cwd=ROOT, capture_output=True, text=True, encoding="utf-8")
    if completed.returncode != 0:
        raise RuntimeError(f"git {' '.join(args)} failed")
    return [line.strip() for line in completed.stdout.splitlines() if line.strip()]


def changed_files(base: str) -> list[str]:
    """Tracked changes against `base` plus untracked files, repository-relative with `/`."""
    files = set(git_lines("diff", "--name-only", base)) | set(git_lines("ls-files", "--others", "--exclude-standard"))
    return sorted(path for path in files if (ROOT / path).is_file())


def all_files() -> list[str]:
    return sorted(git_lines("ls-files"))


def run_command(command: Sequence[str], cwd: Path) -> tuple[bool, list[str]]:
    """Run a tool, returning (ok, last output lines). Never raises on tool failure."""
    executable = shutil.which(command[0])
    if executable is None:
        return False, [f"{command[0]} was not found on PATH."]
    try:
        completed = subprocess.run([executable, *command[1:]], cwd=cwd, capture_output=True, text=True,
                                   encoding="utf-8", errors="replace", timeout=TIMEOUT)
    except subprocess.TimeoutExpired:
        return False, [f"{' '.join(command)} timed out after {TIMEOUT}s."]
    output = (completed.stdout + completed.stderr).splitlines()
    return completed.returncode == 0, [line for line in output if "npm notice" not in line][-40:]


def stage_frontend(files: list[str], full: bool, skip_build: bool) -> StageResult:
    result = StageResult("frontend")
    webui_files = [path for path in files if path.startswith(WEBUI_PREFIX)]
    if not webui_files or skip_build:
        return result
    ok_tsc, tsc_out = run_command(["npx", "tsc", "-b", "--noEmit"], WEBUI)
    lint_targets = ["."] if full else [path[len(WEBUI_PREFIX):] for path in webui_files if path.endswith((".ts", ".tsx"))]
    ok_lint, lint_out = (True, []) if not lint_targets else run_command(["npx", "eslint", *lint_targets], WEBUI)
    result.status = "PASS" if ok_tsc and ok_lint else "FAIL"
    result.detail = ([] if ok_tsc else ["tsc:", *tsc_out]) + ([] if ok_lint else ["eslint:", *lint_out])
    return result


def stage_backend(files: list[str], skip_build: bool) -> StageResult:
    result = StageResult("backend")
    if skip_build or not any(path.startswith(BACKEND_PREFIXES) or path in BACKEND_ROOT_FILES for path in files):
        return result
    ok, output = run_command(["dotnet", "build", "--nologo", "-v", "q"], APP)
    result.status, result.detail = ("PASS", []) if ok else ("FAIL", output)
    return result


def is_checked_source(path: str) -> bool:
    return path.endswith(SOURCE_SUFFIXES) and not any(marker in path for marker in GENERATED_MARKERS)


def is_test_file(path: str) -> bool:
    return path.startswith("tests/") or "/tests/" in path or ".spec." in path or ".test." in path


def csharp_type_spans(lines: list[str]) -> list[tuple[str, int]]:
    """Line span of every top-level brace-delimited C# type (brace counting; strings are rare enough)."""
    spans, depth, current, start = [], 0, None, 0
    for index, line in enumerate(lines):
        if current is None and depth <= 1:
            match = CSHARP_TYPE_PATTERN.match(line)
            if match and not line.rstrip().endswith(";"):
                current, start, open_depth = match.group(1), index, depth
        depth += line.count("{") - line.count("}")
        if current is not None and depth <= open_depth and "}" in line and index > start:
            spans.append((current, index - start + 1))
            current = None
    return spans


def stage_size(files: list[str]) -> StageResult:
    result = StageResult("size", "PASS")
    for path in filter(is_checked_source, files):
        lines = (ROOT / path).read_text(encoding="utf-8", errors="replace").splitlines()
        limit = TEST_LIMIT if is_test_file(path) else SOURCE_LIMIT
        if len(lines) > limit:
            result.detail.append(f"{path}: {len(lines)} lines > {limit}")
        if path.endswith(".cs"):
            for name, span in csharp_type_spans(lines):
                if span > CSHARP_TYPE_LIMIT:
                    result.detail.append(f"{path}: type {name} spans {span} lines > {CSHARP_TYPE_LIMIT}")
    if result.detail:
        result.status = "FAIL"
    return result


def stage_shadows(files: list[str]) -> StageResult:
    result = StageResult("shadows", "PASS")
    for path in files:
        if not path.startswith(WEBUI_PREFIX + "src/") or not path.endswith((".ts", ".tsx", ".css")):
            continue
        for number, line in enumerate((ROOT / path).read_text(encoding="utf-8", errors="replace").splitlines(), 1):
            if SHADOW_PATTERN.search(line):
                result.detail.append(f"{path}:{number}: {line.strip()[:120]}")
    if result.detail:
        result.status = "FAIL"
    return result


def stage_security(files: list[str], forced: bool) -> StageResult:
    result = StageResult("security")
    frontend = forced or any(path in FRONTEND_MANIFESTS for path in files)
    backend = forced or any(BACKEND_MANIFEST_PATTERN.search(path) for path in files)
    if not frontend and not backend:
        return result
    ok = True
    if frontend:
        run_command(["npm", "audit", "fix"], WEBUI)
        audit_ok, audit_out = run_command(["npm", "audit", "--audit-level=high"], WEBUI)
        ok &= audit_ok
        result.detail += [] if audit_ok else ["npm audit (after fix):", *audit_out]
    if backend:
        listed, output = run_command(["dotnet", "list", "package", "--vulnerable", "--include-transitive"], APP)
        vulnerable = not listed or any("has the following vulnerable packages" in line for line in output)
        ok &= not vulnerable
        result.detail += ["dotnet vulnerable packages:", *output] if vulnerable else []
    result.status = "PASS" if ok else "FAIL"
    return result


def parse_args(argv: Sequence[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Deterministic ARSM validation gate.")
    parser.add_argument("--all", action="store_true", help="Check every tracked file instead of the diff.")
    parser.add_argument("--base", default="HEAD", help="Git ref the diff is taken against (default: HEAD).")
    parser.add_argument("--security", action="store_true", help="Run the security stage even without manifest changes.")
    parser.add_argument("--skip-build", action="store_true", help="Skip the tsc/eslint and dotnet build stages.")
    parser.add_argument("--json", action="store_true", help="Print the JSON summary instead of the table.")
    return parser.parse_args(argv)


def main(argv: Sequence[str]) -> int:
    args = parse_args(argv)
    try:
        files = all_files() if args.all else changed_files(args.base)
    except RuntimeError as error:
        print(f"validate: {error}", file=sys.stderr)
        return 2

    stages: list[Callable[[], StageResult]] = [
        lambda: stage_size(files),
        lambda: stage_shadows(files),
        lambda: stage_frontend(files, args.all, args.skip_build),
        lambda: stage_backend(files, args.skip_build),
        # --all widens the file checks only; remediation still needs a manifest change or --security.
        lambda: stage_security([] if args.all else files, args.security),
    ]
    results = [stage() for stage in stages]
    summary = {"scope": "all" if args.all else f"diff:{args.base}", "files": len(files),
               "passed": all(r.status != "FAIL" for r in results), "stages": [asdict(r) for r in results]}

    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    if args.json:
        print(json.dumps(summary, indent=2))
    else:
        print(f"validate: {summary['scope']}, {len(files)} file(s)")
        for r in results:
            print(f"  {r.status:<4}  {r.name}")
            for line in r.detail:
                print(f"        {line}")
    return 0 if summary["passed"] else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
