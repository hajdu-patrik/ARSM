# Tests Rules

## Persona
- Testing/security authority: Zsombor
- Architecture oversight: Patrik

## Scope
- API suites: `tests/API/**/*.http`
- DB suites: `tests/Database/**/*.sql`

## Trigger Policy
- Heavy test work (HTTP/SQL/E2E) runs only on:
  - explicit user request, or
  - significant feature/structural behavior change.
- Non-behavioral change: skip heavy test agents; run docs-sync only for test-layer docs.
- New feature + triggered test agent: auto-generate missing coverage before run/update.

## Engineering Quality in Tests
- Tests must be readable, deterministic, and maintainable.
- Keep setup explicit and assertions focused.
- Prefer smaller scenario-focused files over large all-in-one suites.

## Size Guardrails
- Preferred test file size <= 180 lines.
- Hard limit: > 250 lines must be split by scenario/responsibility.

## SQL Safety
- AI SQL user: `ai_agent_test_user`.
- Read-only `SELECT` only. No DML/DDL.

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
- `ARSM_E2E_*` aliases — optional overrides accepted by `e2e-env.ts`

### Rules
- **HTTP tests**: use `{{$processEnv VAR_NAME}}`; never write literal email/password strings.
- **SQL tests**: read-only `SELECT`, no credentials embedded — connection via `ai_agent_test_user`.
- **E2E tests**: use `getAppointmentFlowEnv()` / `getAdminFlowEnv()` from `e2e-env.ts`; never inline credentials.
- **Running E2E**: always prepend `set -a && source .secrets && set +a` before Playwright commands.
- If a required variable is absent: surface the name and point to `tests/.env.example` or `.secrets`.

## Hygiene
- Use environment-driven credentials and runtime-unique test data.
- Keep suites chunked and focused.
- Keep this file aligned with `.github/instructions/tests.instructions.md`.
