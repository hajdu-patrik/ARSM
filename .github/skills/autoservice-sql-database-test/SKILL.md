---
name: autoservice-sql-database-test
description: Maintain SQL validation suites with strict trigger-gating, read-only policy, and automatic feature-coverage generation.
---

Use this skill to sync `tests/Database/**/*.sql` only.

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
