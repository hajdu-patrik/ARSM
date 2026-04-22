---
name: autoservice-e2e-playwright
description: Sync Playwright E2E test suites in tests/e2e/ whenever UI components, pages, or backend DTOs change.
---

Use this skill whenever frontend UI or backend DTO changes affect E2E test coverage.

## Goal

Keep Playwright E2E test assets synchronized with the current UI behavior:
- Spec files in `tests/e2e/*.spec.ts`
- Page objects in `tests/e2e/pages/*.page.ts`
- Support helpers in `tests/e2e/support/`

## Managed test files

- `tests/e2e/*.spec.ts`
- `tests/e2e/pages/*.page.ts`
- `tests/e2e/support/e2e-env.ts`
- `tests/e2e/support/auth.helper.ts`
- `playwright.config.ts`

## Trigger conditions

Run when any of these change:
- UI components with `data-testid` attributes or interactive elements (buttons, inputs, modals, links)
- Page routing (`src/router/`, `App.tsx`)
- Backend DTOs or API response shapes that affect rendered data or assertions
- Auth flow changes (login, logout, guards, session management)
- i18n keys referenced in test selectors (`getByText`, `getByRole`)

## Workflow

1. Read `app/AutoService.WebUI/CLAUDE.md` (E2E Testing section) for conventions.
2. Determine delta: which UI components, selectors, or API contracts changed.
3. Update affected page objects:
   - Fix broken selectors (`getByTestId`, `getByRole`, `getByText`, `locator`).
   - Add new methods for newly exposed interactive elements.
   - Remove methods for deleted UI elements.
4. Update affected spec files:
   - Adjust assertions to match new behavior/response shapes.
   - Add new test cases for newly added flows.
   - Remove tests for deleted features.
5. If a new page/flow was created, scaffold a new page object class and spec file.
6. Run `npx playwright test --list` to verify tests parse correctly.

## Required conventions

- Follow the Page Object Model pattern — one class per page/modal.
- Use `data-testid` as primary selector strategy; fall back to `getByRole`/`getByText`.
- Keep credentials in `tests/e2e/support/e2e-env.ts` — never hardcode.
- Keep specs focused: one `test.describe` per user flow, small test cases.
- Use shared `initBrowserState` and `loginAsMechanic` helpers from `auth.helper.ts`.
- Admin and phone tests use `test.skip()` when optional env vars are missing.
- Do not modify source code — only test files under `tests/e2e/`.

## Validation checklist

After updates, confirm:
- [ ] Every changed UI element or flow is covered in the correct spec file.
- [ ] Removed UI elements are removed from page objects and specs.
- [ ] Selectors match current DOM structure and `data-testid` attributes.
- [ ] No hardcoded credentials or URLs remain.
- [ ] `npx playwright test --list` parses all specs without errors.

## Reporting

Report: which UI/DTO deltas were detected, which page objects and specs were changed, which test cases were added/updated/removed.
