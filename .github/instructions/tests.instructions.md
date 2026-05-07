---
applyTo: tests/**
description: Use when editing API (.http) and Database (.sql) test suites under tests/. Enforces chunked layout, env-driven credentials, non-reusable test data, and read-only SQL verification policy.
---
# Tests Instructions

## Persona
- Testing/security: Zsombor
- Architecture oversight: Patrik

## Enforce
- Keep chunked suite layout (`tests/API/**`, `tests/Database/**`).
- Credentials via env vars only; generated data must be runtime-unique.
- SQL files are read-only verification (`SELECT` only, no DML/DDL).
- Keep this file synced with `tests/CLAUDE.md`.

## Test Design Standards
- Keep tests readable and focused; one responsibility per scenario block.
- Avoid giant test files and high-coupling setup.
- Use explicit intent in scenario naming and assertions.

## Size Guardrails
- Preferred test file size <= 180 lines.
- Hard limit: > 250 lines must be split by scenario.

## Credentials & Secrets Policy (Mandatory)

Never hardcode credentials, passwords, connection strings, or host addresses in test files.

### Secret Files (gitignored — never commit)
| File | Scope | How consumed |
|---|---|---|
| `.secrets` (repo root) | E2E / Playwright tests | `set -a && source .secrets && set +a` before `npx playwright test` |
| `tests/.env` | HTTP API tests (`.http` files) | `{{$processEnv VAR}}` in REST Client / HTTP Client |

Template: `tests/.env.example` (committed — values are placeholders only).

### Key Variable Names
- `ARSM_TEST_MECHANIC_EMAIL` / `ARSM_TEST_MECHANIC_PASSWORD` — non-admin mechanic login
- `ARSM_TEST_ADMIN_EMAIL` / `ARSM_TEST_ADMIN_PASSWORD` — admin mechanic login
- `ARSM_TEST_CUSTOMER_EMAIL` — passive customer (no login)
- `ARSM_TEST_PASSWORD` / `ARSM_TEST_WRONG_PASSWORD` — shared positive/negative passwords
- `ARSM_TEST_MECHANIC_NEW_PASSWORD` — used in password-change scenarios
- `AutoService_ApiService_HostAddress` — API base URL for `.http` files
- `ARSM_E2E_*` aliases — optional overrides for helper-based E2E suites when present

### Rules
- **HTTP tests**: use `{{$processEnv VAR_NAME}}`; never write literal email/password strings.
- **SQL tests**: read-only `SELECT`, no credentials embedded — connection via `ai_agent_test_user`.
- **E2E tests**: if a helper such as `e2e-env.ts` exists, use it for credential loading; otherwise use env vars directly and never inline credentials.
- **Running E2E**: always prepend `set -a && source .secrets && set +a` before Playwright commands.
- If a required variable is absent: surface the name and point to `tests/.env.example` or `.secrets`.

## Trigger Gates
- `http-endpoint-test` / `sql-database-test` / `e2e-playwright-test` run only on:
  - explicit user request, or
  - significant feature/structural behavior change.
- If a new feature triggers these agents, generate missing coverage first.
- Non-behavioral changes default: docs-sync only for test-layer docs.
