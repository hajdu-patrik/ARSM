---
applyTo: tests/**
description: Use when editing API/SQL test suites under tests/ with env-driven credentials and read-only SQL policy.
---
# Tests Instructions

## Scope

- API suites: `tests/API/**/*.http`
- DB suites: `tests/Database/**/*.sql`
- Runner: `python scripts/run-local-test-suite.py [all|playwright|http|sql]`

## Trigger Gates

- Heavy test work only on explicit request or significant behavior change.
- `http-endpoint-test`: API contract/auth/status/validation changes.
- `sql-database-test`: schema/persistence/integrity changes.
- `e2e-playwright-test`: frontend structural/user-flow changes.
- New feature + triggered test agent: generate missing coverage first.
- Non-behavioral changes: docs-sync only for test-layer docs.

## Core Rules

- Keep tests deterministic, focused, and chunked by responsibility.
- Size limits: preferred <= 180 lines, hard split > 250 lines.
- SQL policy: `ai_agent_test_user`, `SELECT` only, no DML/DDL.

## Secrets Policy

- Never hardcode credentials/hosts/connection strings.
- HTTP uses `tests/.env` with `{{$processEnv VAR}}`.
- HTTP cookie-auth mutation suites use `ARSM_TEST_WEBUI_ORIGIN` for the allowed `Origin` header.
- Playwright uses `.secrets`.
- Template file is `tests/.env.example`.
- Keep MCP SQL templates on `ARSM_MCP_POSTGRES_CONNECTION_STRING`; local gitignored `.claude/.mcp.json` and `.vscode/mcp.json` may hold the concrete read-only PostgreSQL URI for `ai_agent_test_user`.

## AI Reporting Contract

- Runner child commands default to a 300-second timeout; use `ARSM_TEST_COMMAND_TIMEOUT_SECONDS` only for slower local runs.
- Use `tests/.artifacts/test-suite-summary.json` as sanitized source.
- Never publish raw env/secrets/tokens/cookies/absolute paths/unsanitized logs.

## Coverage Anchors

- VIN/kW/drivetrain contract (no HP/torque fields).
- Customer search/list + scheduler lookup (email/plate/name).
- Profile picture GET cache headers, ETag conditional `304`, and auth/cookie `Vary` behavior.
- Scheduler intake + customer details/history split-view E2E expectations.
