---
name: autoservice-e2e-playwright
description: Maintain Playwright E2E suites with strict trigger-gating and automatic feature-coverage generation.
---

Use this skill to sync `app/AutoService.WebUI/tests/e2e/**` only.

## Why This Skill Exists

- E2E coverage is the last guard against regressions that pass unit, type, and build checks but still break real user journeys.
- This skill keeps navigation, interaction, auth, and outcome assertions aligned with the actual UI contract instead of leaving flows to drift silently.

## When to Use It

- Use it for user-visible flow changes, auth/role transitions, DTO-visible UI changes, or when the user explicitly asks for E2E execution or maintenance.
- Do not use it for backend-only refactors with no user-visible behavior change.

## What Breaks If Ignored

- Critical journeys can fail in production even when code compiles and targeted component tests remain green.
- Selectors, page objects, and auth guard expectations drift, causing brittle tests and late discovery of broken flows.

## Trigger Gate (mandatory)
Run only when:
- explicitly requested, or
- significant UI/DTO-visible structural flow change exists.
Otherwise: return `SKIPPED`.

## New Feature Rule
If triggered by a new feature:
- auto-generate missing E2E coverage before executing/updating tests.

## Coverage Requirements
- Cover changed user-visible flows end-to-end (navigation, interaction, outcome).
- Add negative/guard scenarios when auth, role, or validation behavior changed.
- Keep page-object methods aligned with changed selectors and interactions.

## Credentials Policy (Mandatory)
- Read credentials via `getAppointmentFlowEnv()` / `getAdminFlowEnv()` from `tests/e2e/support/e2e-env.ts`.
- Variables consumed from `.secrets` (gitignored): `ARSM_TEST_MECHANIC_EMAIL`, `ARSM_TEST_MECHANIC_PASSWORD`, `ARSM_TEST_WRONG_PASSWORD`, `ARSM_TEST_CUSTOMER_EMAIL`, `ARSM_TEST_ADMIN_EMAIL`, `ARSM_TEST_ADMIN_PASSWORD`.
- Never inline credentials; never hardcode email/password strings in spec or page-object files.
- To run: `set -a && source .secrets && set +a && npx playwright test`.
- If a variable is absent: surface the name, point to `.secrets` — do not guess.

## Test Design Guardrails
- Prefer E2E spec files <= 180 lines where practical.
- Hard split required when a spec file exceeds 250 lines.
- Keep Page Object Model boundaries clear.
- Prefer stable selectors (`data-testid` first, then role-based fallbacks).

## Workflow
1. Read UI and DTO-visible deltas from affected frontend/backend contracts.
2. Update page objects for selector and interaction changes.
3. Update specs for changed outcomes and flow assertions.
4. Add missing feature-coverage scenarios when triggered.
5. Validate parse/list first, then run targeted tests.
6. Report coverage updates, failures, and residual risks.
