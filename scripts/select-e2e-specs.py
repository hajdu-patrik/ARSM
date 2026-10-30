#!/usr/bin/env python3
"""Select the Playwright specs affected by the WebUI diff; see scripts/CLAUDE.md for the mapping rules and usage."""

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
    "src/pages/Admin/": ("admin-register-edge", "admin-password-reset", "route-guards", "admin-roster", "admin-register-form", "admin-register-errors", "admin-layout-hu"),
    "src/pages/ChangePassword/": ("forced-password-change", "settings-password", "route-guards"),
    "src/pages/CompanyResults/": ("company-results", "company-results-period", "company-results-states", "company-results-flow", "list-alignment", "hu-wording"),
    "src/pages/Customers/": ("customer-registry", "customer-vehicle-tile", "customer-delete-visibility", "auth-session", "quote-editor", "quote-status", "quote-list", "quote-header", "customer-create-edit", "customer-delete", "customer-list-states", "customer-history", "customer-layout-hu", "vehicle-form-create", "vehicle-form-edit", "vehicle-delete", "vehicle-deep-link", "pagination-registry"),
    "src/pages/Inventory/": ("catalog-parts", "catalog-labor-types", "catalog-validation", "catalog-states", "catalog-hu", "vat-options", "pagination-catalog-quotes", "list-single-request", "list-alignment"),
    "src/pages/Login/": ("login-edge", "login-validation", "login-failures", "auth-session", "auth-session-expiry", "forced-password-change", "route-guards"),
    "src/pages/Quotes/": ("quote-editor", "quote-status", "quote-list", "quote-header", "quote-header-details", "quote-validity", "quote-lines", "quote-line-validation", "quote-conflicts", "quote-send", "quote-pdf", "quote-delete", "quote-hu", "quote-pagination", "quote-appointment-lock", "vat-options", "list-single-request", "company-results", "list-alignment"),
    "src/pages/Scheduler/": ("scheduler-intake", "intake-suggestions", "scheduler-live-status", "scheduler-live-updates", "scheduler-appointment-delete", "scheduler-concurrency", "scheduler-reads", "scheduler-lifecycle-rules", "scheduler-calendar", "scheduler-month-list", "scheduler-claim", "scheduler-claim-refusals", "scheduler-admin-assign", "scheduler-detail-edit", "scheduler-refusals", "scheduler-intake-validation", "scheduler-intake-customers", "scheduler-read-failure", "appointment-quote-link", "appointment-vehicle-link"),
    "src/pages/Settings/": ("settings-edge", "settings-profile", "settings-password", "settings-picture", "settings-account", "settings-company"),
    "src/pages/NotFound.tsx": ("error-routes-edge",),
    "src/pages/ServerError.tsx": ("error-routes-edge",),
    "src/router/": ("route-guards", "error-routes-edge", "auth-session", "auth-session-expiry", "forced-password-change"),
    "src/components/layout/": ("shell-sidebar", "shell-narrow", "theme-persistence", "settings-edge"),
    "src/components/seo/": ("shell-seo",),
    "src/components/common/ToastViewport": ("shell-toast",),
    "src/store/toast": ("shell-toast",),
    "src/store/theme": ("theme-persistence", "settings-edge"),
    "src/utils/legacyStorageMigration": ("shell-storage",),
    "src/utils/safeStorage": ("shell-storage", "theme-persistence"),
    "src/utils/browserStorageKeys": ("shell-storage", "theme-persistence"),
    "src/utils/imageInspection": ("settings-picture",),
    "src/utils/imageCrop": ("settings-picture",),
    "src/services/auth/": ("auth-session", "auth-session-expiry", "login-failures"),
    "src/services/http/api.client": ("auth-session", "auth-session-expiry", "auth-refresh-tabs", "forced-password-change"),
    "tests/e2e/support/list-alignment": ("list-alignment",),
}
# The axe sweep covers every route, so a change under src/ that has a rule of its own selects it as well.
AXE_SWEEP_SPEC = "accessibility"
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
            if (E2E_DIR / f"{spec_match.group(1)}.spec.ts").is_file():
                    selected.add(spec_match.group(1))
        elif page_match:
            selected |= specs_using_page_object(page_match.group(1))
        else:
            rule = next((specs for prefix, specs in FEATURE_SPECS.items() if path.startswith(prefix)), None)
            if rule is None:
                return None
            selected.update(rule)
            if path.startswith("src/"):
                selected.add(AXE_SWEEP_SPEC)
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
