---
name: autoservice-sql-database-test
description: Maintain SQL validation suites with strict trigger-gating, read-only policy, and automatic feature-coverage generation.
disable-model-invocation: true
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

## Test Design Guardrails
- Prefer SQL files <= 180 lines.
- Hard split required when a SQL file exceeds 250 lines.
- Keep chunking by concern: `core-schema`, `identity-auth`, `feature-flow`.
- Keep query intent explicit and deterministic.

## Workflow
1. Read schema/model deltas from entities, DbContext, and migrations.
2. Map each delta to the proper SQL suite area.
3. Add/update `SELECT` verification queries for changed behavior.
4. Remove stale checks.
5. Verify read-only policy is preserved (no DML/DDL).
6. Report added/updated/removed queries and uncovered risks.
