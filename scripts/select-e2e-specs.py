#!/usr/bin/env python3
"""Select the Playwright specs affected by the current WebUI changes.

Maps changed files to the E2E specs that cover them, so the canonical runner can run a targeted
subset instead of the full suite. The mapping is deliberately conservative: a changed file that is
not covered by a feature rule below (shared components, utils, services, store, styles, config,
test support) selects the FULL suite, so a targeted run never silently skips coverage.

Usage:
  python scripts/select-e2e-specs.py [--base REF]          print the selection
  python scripts/select-e2e-specs.py [--base REF] --run    run it via run-local-test-suite.py playwright
Output: nothing (no WebUI change), `ALL`, or space-separated spec paths relative to the WebUI.
Exit codes: 0 success, 2 git error; with --run, the runner's exit code.
"""

from __future__ import annotations

import argparse
import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WEBUI_PREFIX = "app/AutoService.WebUI/"
E2E_DIR = ROOT / "app" / "AutoService.WebUI" / "tests" / "e2e"

# Feature folder (WebUI-relative prefix) -> spec file names that exercise it.
FEATURE_SPECS: dict[str, tuple[str, ...]] = {
    "src/pages/Admin/": ("admin-register-edge", "route-guards"),
    "src/pages/CompanyResults/": ("company-results", "list-alignment"),
    "src/pages/Customers/": ("customer-registry", "auth-session", "quote-editor", "quote-status"),
    "src/pages/Inventory/": ("catalog-parts", "catalog-labor-types", "list-alignment"),
    "src/pages/Login/": ("login-edge", "auth-session", "route-guards"),
    "src/pages/Quotes/": ("quote-editor", "quote-status", "company-results", "list-alignment"),
    "src/pages/Scheduler/": ("scheduler-intake", "scheduler-live-status", "scheduler-live-updates"),
    "src/pages/Settings/": ("settings-edge",),
    "src/pages/NotFound.tsx": ("error-routes-edge",),
    "src/pages/ServerError.tsx": ("error-routes-edge",),
    "src/router/": ("route-guards", "error-routes-edge", "auth-session"),
    "tests/e2e/support/list-alignment": ("list-alignment",),
}
PAGE_OBJECT_PATTERN = re.compile(r"^tests/e2e/pages/([\w-]+)\.page\.ts$")
SPEC_PATTERN = re.compile(r"^tests/e2e/([\w-]+)\.spec\.ts$")


def changed_webui_files(base: str) -> list[str]:
    """WebUI-relative paths changed against `base`, untracked files included."""
    outputs = []
    for args in (("diff", "--name-only", base), ("ls-files", "--others", "--exclude-standard")):
        completed = subprocess.run(["git", *args], cwd=ROOT, capture_output=True, text=True, encoding="utf-8")
        if completed.returncode != 0:
            raise RuntimeError(f"git {' '.join(args)} failed")
        outputs += completed.stdout.splitlines()
    return sorted({path[len(WEBUI_PREFIX):] for path in outputs if path.startswith(WEBUI_PREFIX)})


def specs_using_page_object(page_object: str) -> set[str]:
    """Specs that import the given page object module (for example `quotes` -> quotes.page)."""
    needle = f"./pages/{page_object}.page"
    return {spec.name[: -len(".spec.ts")] for spec in E2E_DIR.glob("*.spec.ts") if needle in spec.read_text(encoding="utf-8")}


def select_specs(files: list[str]) -> set[str] | None:
    """Spec names for the changed files, or None when the full suite must run."""
    selected: set[str] = set()
    for path in files:
        if path.endswith(".md"):
            continue
        spec_match, page_match = SPEC_PATTERN.match(path), PAGE_OBJECT_PATTERN.match(path)
        if spec_match:
            selected.add(spec_match.group(1))
        elif page_match:
            selected |= specs_using_page_object(page_match.group(1))
        else:
            rule = next((specs for prefix, specs in FEATURE_SPECS.items() if path.startswith(prefix)), None)
            if rule is None:
                return None
            selected.update(rule)
    return selected


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Select the Playwright specs affected by the WebUI diff.")
    parser.add_argument("--base", default="HEAD", help="Git ref the diff is taken against (default: HEAD).")
    parser.add_argument("--run", action="store_true", help="Run the selection through the canonical runner.")
    args = parser.parse_args(argv)
    try:
        files = changed_webui_files(args.base)
    except RuntimeError as error:
        print(f"select-e2e-specs: {error}", file=sys.stderr)
        return 2

    specs = select_specs(files) if files else set()
    selection = "ALL" if specs is None else " ".join(f"tests/e2e/{name}.spec.ts" for name in sorted(specs))
    if not args.run:
        print(selection)
        return 0
    if not selection:
        print("select-e2e-specs: no WebUI change, nothing to run.")
        return 0
    environment = {**os.environ, "ARSM_E2E_SPECS": "" if selection == "ALL" else selection}
    runner = ROOT / "scripts" / "run-local-test-suite.py"
    return subprocess.run([sys.executable, str(runner), "playwright"], cwd=ROOT, env=environment).returncode


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
