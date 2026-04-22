---
name: autoservice-http-endpoint-test
description: Sync API HTTP test suites in tests/API/ whenever endpoints are added/changed/removed.
---

Use this skill whenever API endpoint surface changes — HTTP test files only.

## Goal

Keep HTTP endpoint test assets synchronized with the current API behavior:
- HTTP suites in `tests/API/` (including chunked subfolders)

## Managed test files

- `tests/API/auth/*.http`
- `tests/API/appointments/*.http`
- `tests/API/customers/*.http`
- `tests/API/profile/*.http`
- `tests/API/admin/*.http`
- `tests/API/vehicles/*.http`
- `tests/API/**/*.http`

## Trigger conditions

Run when any of these change:
- Endpoint mapping files (`Auth/*Endpoints*.cs`, `Appointments/*Endpoints*.cs`, `Profile/*Endpoints*.cs`, `Admin/*Endpoints*.cs`)
- Request/response contracts used by endpoints
- Auth/authorization behavior affecting endpoint outcomes (401/403/429, required role, lockout/rate-limit behavior)

## Workflow

1. Read current endpoint mappings and contracts from source code (do not guess).
2. Determine delta: new endpoint, removed endpoint, changed route/method/body/auth rule/response semantics.
3. Update the correct HTTP suite(s):
   - Add/update Positive and Negative blocks
   - Keep setup/login/session prerequisites explicit
   - Preserve variable-driven style (`@...`) and section separators
4. Ensure suite naming and responsibility boundaries remain clean (auth/session vs appointments vs profile vs admin).

## Required conventions

- Keep existing test style and comments.
- For each endpoint change, include at least one positive and one negative case when meaningful.
- Keep admin/non-admin authorization checks explicit where relevant.
- For appointment intake/update changes, keep explicit coverage for duplicate new-vehicle license-plate conflicts (`409`) and `scheduledDate` immutability enforcement (`422`).
- Keep request field terminology aligned with current DTO naming (`scheduledDate`, `dueDateTime`) and ISO date-time formatting.
- If multipart upload cannot be represented reliably in `.http`, keep a short `curl` note.
- Do not delete unrelated tests.

## Validation checklist

After updates, confirm:
- [ ] Every changed/new endpoint is represented in the correct `.http` suite.
- [ ] Removed endpoints are removed from suites.
- [ ] Status code expectations match current handlers.
- [ ] No stale variables or cross-suite dependencies remain.

## Reporting

Report: which endpoint deltas were detected, which `.http` files were changed, which test cases were added/updated/removed.
