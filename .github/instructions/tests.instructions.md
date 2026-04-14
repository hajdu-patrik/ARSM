---
applyTo: tests/**
description: Use when editing API (.http) and Database (.sql) test suites under tests/. Enforces chunked layout, env-driven credentials, non-reusable test data, and read-only SQL verification policy.
---

# Tests Instructions

Apply these rules whenever editing files in `tests/**`.

## Suite Layout

- API endpoint suites are chunked in `tests/API/**`.
- Database verification suites are chunked in `tests/Database/**`.
- Keep chunk files focused by area (auth, appointments, customers, vehicles, profile, admin).

### API chunks

- `tests/API/auth/` - register setup/rules/validation, login matrix, session lifecycle, health
- `tests/API/appointments/` - intake, mechanic flows, admin create/update, admin assign flows
- `tests/API/customers/` - list/lookup, create, update, delete
- `tests/API/vehicles/` - list/get/create positive, create validation/authz, update, delete
- `tests/API/profile/` - profile core, profile picture, account deletion
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

## HTTP File Conventions

- Ensure each `.http` file starts with a standard title banner and separator.
- Keep a top-level variable block and include `@AutoService_ApiService_HostAddress` where requests depend on host resolution.
- Prefer environment-driven variables via `{{$processEnv ...}}` for credentials and actor identities.

## Data Hygiene

- Never hardcode real or sensitive credentials in test files.
- Prefer synthetic identifiers only (for example `example.test`).
- For create flows, use run-scoped unique suffixes (`{{$timestamp}}`) to avoid reusable test data collisions.
- Keep non-admin authentication requests mapped to non-admin password variables.

## SQL Verification Rules

- SQL files under `tests/Database/**` are read-only verification suites.
- Only `SELECT` queries are allowed.
- Do not add DML or DDL statements (`INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `ALTER`, `CREATE`, `DROP`, `GRANT`, `REVOKE`).

## Sync Requirement

- Keep this file and `tests/CLAUDE.md` synchronized.
- When test layout, env requirements, or policy changes, update both files in the same change.

## Agent Workflow Alignment

- Route endpoint-test updates through the endpoint test sync workflow.
- After endpoint behavior changes, sync both API `.http` and database `.sql` suites.
- Keep test guidance consistent with project-level `CLAUDE.md` and `.github` instructions.
