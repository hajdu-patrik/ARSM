# Tests Rules

## Scope and Ownership

- Primary owner: Zsombor
- Architecture escalation: Patrik
- Scope: `tests/API/**/*.http`, `tests/Database/**/*.sql`, `scripts/run-local-test-suite.py`

## Trigger Gates

- Heavy test work only on explicit request or significant behavior change.
- `http-endpoint-test`: API contract/auth/status/validation changes.
- `sql-database-test`: schema/persistence/integrity changes.
- `e2e-playwright-test`: frontend structural/user-flow changes.
- New feature + triggered test agent: generate missing coverage first.
- Non-behavioral changes: docs-sync only for test-layer docs.

## Core Rules

- Keep tests deterministic, focused, and chunked by scenario.
- Size limits: preferred <= 180 lines, hard split > 250 lines.
- SQL policy: `ai_agent_test_user`, `SELECT` only, no DML/DDL.

## Secrets Policy

- Never hardcode credentials, hosts, or connection strings.
- `.secrets` for Playwright; `tests/.env` for HTTP; `tests/.env.example` as template.
- HTTP cookie-auth mutation suites use `ARSM_TEST_WEBUI_ORIGIN` for the allowed `Origin` header.
- Keep MCP SQL profile on `ARSM_MCP_POSTGRES_CONNECTION_STRING` with read-only user.

## Canonical Runner Contract

- Use `python scripts/run-local-test-suite.py [all|playwright|http|sql]`.
- Runner child commands default to a 300-second timeout; use `ARSM_TEST_COMMAND_TIMEOUT_SECONDS` only for slower local runs.
- Use `tests/.artifacts/test-suite-summary.json` as sanitized AI-readable source.
- Never publish raw `.env`, `.secrets`, tokens, cookies, absolute paths, or unsanitized logs.

## Coverage Anchors

- VIN/kW/drivetrain contract (no HP/torque fields).
- Customer search/list + scheduler lookup (email/plate/name).
- Scheduler intake and customer details/history split-view E2E behavior.
