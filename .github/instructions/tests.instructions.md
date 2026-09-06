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
- Test agents own create, update, and delete inside their own scope paths; delete only obsolete or relocated coverage, never to make a run pass.
- E2E specs are type-checked through `tsconfig.e2e.json` in the `tsc -b` chain; Playwright itself transpiles with esbuild and never type-checks them.

## Secrets Policy

- Never hardcode credentials/hosts/connection strings.
- HTTP uses `tests/.env` with `{{$processEnv VAR}}`.
- HTTP cookie-auth mutation suites use `ARSM_TEST_WEBUI_ORIGIN` for the allowed `Origin` header.
- Playwright uses `.secrets`.
- Template file is `tests/.env.example`.
- Keep tracked MCP SQL templates placeholder-based; local gitignored `.claude/.mcp.json` and `.vscode/mcp.json` must hold the concrete read-only PostgreSQL URI for `ai_agent_test_user` on developer machines.

## AI Reporting Contract

- Runner child commands default to a 300-second timeout; use `ARSM_TEST_COMMAND_TIMEOUT_SECONDS` only for slower local runs.
- Use `tests/.artifacts/test-suite-summary.json` as sanitized source.
- Never publish raw env/secrets/tokens/cookies/absolute paths/unsanitized logs.

## Coverage Anchors

- VIN/kW/drivetrain contract (no HP/torque fields).
- Customer search/list + scheduler lookup (email/plate/name).
- Profile picture GET cache headers, ETag conditional `304`, and auth/cookie `Vary` behavior.
- Profile picture upload contract: JPEG/PNG/WebP in, always `image/webp` out, 4 MB cap, 422 on magic-byte or decode failure. Image fixtures must be structurally valid (correct chunk CRCs), because the API decodes and re-encodes every upload.
- `people` profile-picture column contract and the legacy-column-removal post-condition check in `tests/Database/core-schema/core-schema-contracts.sql`.
- Profile-picture HTTP checks share `tests/API/profile/profile_picture_check_support.py`; the runner still invokes only `profile-picture-upload-check.py`.
- Scheduler intake + customer details/history split-view E2E expectations.
