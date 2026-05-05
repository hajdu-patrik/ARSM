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

## Hygiene
- Use environment-driven credentials and runtime-unique test data.
- Keep suites chunked and focused.
- Keep this file aligned with `.github/instructions/tests.instructions.md`.
