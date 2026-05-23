---
name: autoservice-e2e-playwright-test
description: 'Maintain ARSM Playwright E2E suites. Use when WebUI user flows, auth/role journeys, DTO-visible UI behavior, selectors/page objects, app/AutoService.WebUI/tests/e2e files, or explicit Playwright requests change.'
disable-model-invocation: true
---

Use this skill for `app/AutoService.WebUI/tests/e2e/**`.

## Trigger Gate

- Run only on explicit request or significant frontend/user-flow change.
- Otherwise return `SKIPPED`.

## Required Behavior

- New feature + triggered gate: generate missing coverage first.
- Keep role/auth flows, navigation paths, and DTO-visible UI assertions aligned.
- Prefer stable selectors (`getByRole`, `getByLabel`, `getByTestId`).
- Keep tests deterministic and environment-driven.

## Execution

- Run with `python scripts/run-local-test-suite.py playwright`.
- Use only sanitized summary: `tests/.artifacts/test-suite-summary.json`.
