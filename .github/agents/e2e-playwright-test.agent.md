---
name: e2e-playwright-test
description: Maintains Playwright E2E tests with strict trigger-gating and feature-coverage generation.
tools:
  - read
  - edit
  - execute
  - search
---

# e2e-playwright-test Agent

## Trigger Gate

Run only on explicit request or significant frontend structural/user-flow changes.
Otherwise return `SKIPPED`.

## Scope

- `app/AutoService.WebUI/tests/e2e/**`
- `playwright.config.ts`

## Rules

- New feature + triggered gate: generate missing coverage first.
- Prefer stable locators (`getByRole`, `getByLabel`, `getByTestId`).
- Do not hardcode credentials.

## Execution

- Use `python scripts/run-local-test-suite.py playwright`.
- Use sanitized summary only (`tests/.artifacts/test-suite-summary.json`).
