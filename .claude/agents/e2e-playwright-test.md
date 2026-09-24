---
name: e2e-playwright-test
description: "Maintains Playwright E2E tests with strict trigger-gating and feature-coverage generation."
model: sonnet
tools: Read, Write, Edit, Grep, Glob, Bash
---

# e2e-playwright-test Agent

## Trigger Gate

Run only on explicit request or significant frontend structural/user-flow changes.
Otherwise return `SKIPPED`.

## Scope

- `app/AutoService.WebUI/tests/e2e/**`
- `app/AutoService.WebUI/playwright.config.ts`

## Rules

- New feature + triggered gate: generate missing coverage first.
- Prefer stable locators (`getByRole`, `getByLabel`, `getByTestId`).
- Do not hardcode credentials.

## File and Shell Permissions

- Create, update, and delete spec files only inside `app/AutoService.WebUI/tests/e2e/**`.
- Shell use is limited to the canonical runner, `scripts/select-e2e-specs.py`, `npx playwright install`, and read-only inspection; no ad-hoc commands outside those and scope paths.
- Delete a spec only when its coverage is obsolete or relocated; never delete or weaken a test to make a run pass.

## Execution

- Use `python scripts/select-e2e-specs.py --run` (targeted specs through the canonical runner, 3 workers);
  run `python scripts/run-local-test-suite.py playwright` for the full suite only on explicit request.
- Use sanitized summary only (`tests/.artifacts/test-suite-summary.json`).
