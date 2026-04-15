# Tests Guidelines

This folder uses chunked suites (subfolders) for focused execution and fast debugging.

## Scope

- API endpoint suites: `tests/API/**/*.http`
- Database verification suites: `tests/Database/**/*.sql`

## Structure

### API chunks

- `tests/API/auth/` - register setup/rules/validation, login matrix, session lifecycle, health
- `tests/API/appointments/` - intake, mechanic claim/unclaim, status transitions, admin create/update, admin assign/unassign
- `tests/API/customers/` - list/lookup, create, update, delete
- `tests/API/vehicles/` - list/get/create positive, create validation/authz, update, delete
- `tests/API/profile/` - profile get/update, name validation/password, profile picture, account deletion
- `tests/API/admin/` - list, delete invariants, authz

### Database chunks

- `tests/Database/identity-auth/` - identity/auth verification queries
- `tests/Database/feature-flow/` - operational state, customer/vehicle integrity, regression guards
- `tests/Database/core-schema/` - schema/seed baseline checks

## Required Environment Variables

For API `.http` suites:

- `AutoService_ApiService_HostAddress`
- `ARSM_TEST_ADMIN_EMAIL`
- `ARSM_TEST_ADMIN_PASSWORD`
- `ARSM_TEST_MECHANIC_EMAIL`
- `ARSM_TEST_MECHANIC_PASSWORD`
- `ARSM_TEST_MECHANIC_NEW_PASSWORD`
- `ARSM_TEST_CUSTOMER_EMAIL`
- `ARSM_TEST_PASSWORD`
- `ARSM_TEST_WRONG_PASSWORD`

## File Size Rule

- If any `.http` or `.sql` test file exceeds 200 lines, split it into multiple files with corresponding descriptive names in the same folder.
- Keep each file focused on a single logical area (e.g., claim/unclaim, status transitions, validation).

## Test Data Policy

- API suites must use runtime-scoped values (`{{$timestamp}}`) for create flows to avoid reusable records.
- Use synthetic domains only (`example.test`) for generated emails.
- Keep credentials environment-driven only; never hardcode passwords in test files.
- Keep non-admin authentication payloads mapped to `NonAdminPassword` variables.

## SQL Safety Policy

- SQL suites are verification-only and must remain read-only `SELECT` queries.
- Never add DML/DDL in test SQL files (`INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `ALTER`, `CREATE`, `DROP`, `GRANT`, `REVOKE`).

## Pairing Rule

- Keep this file aligned with `.github/instructions/tests.instructions.md`.
- If test layout, env requirements, or test data policy changes, update both files.

## Agent Workflow Alignment

- Route endpoint-test updates through the endpoint test sync workflow.
- After endpoint behavior changes, sync both API `.http` and database `.sql` suites.
- Keep test guidance consistent with project-level `CLAUDE.md` and `.github` instructions.
