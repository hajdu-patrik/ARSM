---
name: autoservice-endpoint-tests-sync
description: Update API HTTP test suites and database SQL validation suites whenever endpoints are added/changed/removed. Invoke after endpoint changes to keep tests aligned.
---

Use this skill whenever API endpoint surface changes.

Slash entrypoint:
- Use `/endpoint-tests-sync` after adding/modifying/removing endpoints.

## Goal

Keep endpoint-level test assets synchronized with the current API behavior:
- HTTP suites in `tests/API/` (including chunked subfolders)
- SQL validation suites in `tests/Database/` (including chunked subfolders)

## Managed test files

HTTP suites (chunked):
- `tests/API/auth/*.http`
- `tests/API/appointments/*.http`
- `tests/API/customers/*.http`
- `tests/API/profile/*.http`
- `tests/API/admin/*.http`
- `tests/API/vehicles/*.http`
- `tests/API/**/*.http`

SQL suites:
- `tests/Database/core-schema/*.sql`
- `tests/Database/identity-auth/*.sql`
- `tests/Database/feature-flow/*.sql`
- `tests/Database/**/*.sql`

## Trigger conditions

Run this skill when any of these change:
- endpoint mapping files (`Auth/*Endpoints*.cs`, `Appointments/*Endpoints*.cs`, `Profile/*Endpoints*.cs`, `Admin/*Endpoints*.cs`)
- request/response contracts used by endpoints
- auth/authorization behavior affecting endpoint outcomes (401/403/429, required role, lockout/rate-limit behavior)
- persistence model affecting SQL validation semantics

## Workflow

1. Read current endpoint mappings and contracts from source code (do not guess).
2. Determine delta: new endpoint, removed endpoint, changed route/method/body/auth rule/response semantics.
3. Update the correct HTTP suite(s):
   - add/update Positive and Negative blocks
   - keep setup/login/session prerequisites explicit
   - preserve variable-driven style (`@...`) and section separators
4. Update SQL suite(s) if endpoint behavior requires persistence-level validation updates.
5. Ensure suite naming and responsibility boundaries remain clean (auth/session vs appointments vs profile vs admin).

## Required conventions

- Keep existing test style and comments.
- For each endpoint change, include at least one positive and one negative case when meaningful.
- Keep admin/non-admin authorization checks explicit where relevant.
- For appointment intake/update changes, keep explicit coverage for duplicate new-vehicle license-plate conflicts (`409`) and `scheduledDate` immutability enforcement (`422`).
- Keep request field terminology and comments aligned with current DTO naming (`scheduledDate`, `dueDateTime`) and ISO date-time formatting expectations.
- If multipart upload cannot be represented reliably in `.http`, keep a short `curl` note.
- Do not delete unrelated tests.

## Validation checklist

After updates, confirm:
- [ ] Every changed/new endpoint is represented in the correct `.http` suite.
- [ ] Removed endpoints are removed from suites.
- [ ] Status code expectations match current handlers.
- [ ] SQL checks still cover identity/auth and feature-flow integrity.
- [ ] No stale variables or cross-suite dependencies remain.

## Reporting

At the end, report:
- which endpoint deltas were detected
- which `.http` and `.sql` files were changed
- which new test cases were added/updated/removed
