---
name: autoservice-sql-database-test
description: 'Maintain ARSM SQL validation suites. Use when EF schema, DbContext, migrations, persistence invariants, tests/Database SQL files, read-only `SELECT` checks, or explicit SQL test requests require coverage updates.'
---

Use this skill to sync `tests/Database/**/*.sql` only.

## Persona
- Primary owner: Zsombor
- Architecture escalation: Patrik

## Why This Skill Exists

- SQL verification catches persistence and integrity regressions that are not obvious from endpoint behavior alone.
- This skill keeps read-only database assertions aligned with schema, identity, and feature-flow invariants without compromising safety.

## When to Use It

- Use it for schema changes, persistence behavior changes, seed-data expectation changes, or when the user explicitly asks for SQL verification execution or maintenance.
- Do not use it for UI-only edits with no persistence impact.

## What Breaks If Ignored

- Silent schema drift, broken integrity assumptions, or identity linkage regressions can survive until late manual investigation.
- SQL suites become stale and stop proving the invariants they were meant to protect.

## Trigger Gate (mandatory)
Run only when:
- explicitly requested, or
- significant schema/persistence behavior change exists.
Otherwise: return `SKIPPED`.

## New Feature Rule
If triggered by a new feature:
- auto-generate missing SQL validation coverage before executing/updating suites.

## Safety
- Use `ai_agent_test_user`.
- Read-only `SELECT` only.
- No DML/DDL.

## Coverage Requirements
- Cover changed schema and persistence behavior with targeted verification queries.
- Validate impacted identity/auth and feature-flow integrity constraints.
- Remove stale checks that reference removed schema fields.

## Credentials Policy (Mandatory)
- SQL tests connect via the read-only `ai_agent_test_user` account.
- Connection string is never embedded in SQL files or agent output.
- Use `appsettings.Local.json` (gitignored) or environment injection for connection config.
- If a connection detail is absent: surface the missing config key -- do not guess or hardcode.

## Execution Contract
- Run SQL validation with `python scripts/run-local-test-suite.py sql` from the repository root.
- Inspect `tests/.artifacts/test-suite-summary.json`; use the sanitized SQL result to add, fix, or investigate database validation checks.
- Do not publish raw connection strings, local MCP config, container details, absolute local paths, or unsanitized `psql` output.

## Test Design Guardrails
- Prefer SQL files <= 180 lines.
- Hard split required when a SQL file exceeds 250 lines.
- Keep chunking by concern: `core-schema`, `identity-auth`, `feature-flow`.
- Keep query intent explicit and deterministic.

## SQL Best Practices (mandatory)
- Never use `SELECT *`; always enumerate explicit columns.
- Use explicit table aliases and semantic `AS` aliases for computed columns.
- Keep one selected expression per line for multi-column queries.
- Keep deterministic ordering for multi-row output verification.
- Do not use positional grouping/sorting (`GROUP BY 1`, `ORDER BY 1`).
- Include explicit expected semantics in each query block comment.

## Workflow
1. Read schema/model deltas from entities, DbContext, and migrations.
2. Map each delta to the proper SQL suite area.
3. Add/update `SELECT` verification queries for changed behavior.
4. Remove stale checks.
5. Verify read-only policy is preserved (no DML/DDL).
6. Modernize touched queries to SQL best practices.
7. If execution is needed, run the Python runner SQL target and inspect the sanitized report.
8. Report added/updated/removed queries and uncovered risks.
