---
name: autoservice-sql-database-test
description: 'Maintain ARSM SQL validation suites. Use when EF schema, DbContext, migrations, persistence invariants, tests/Database SQL files, read-only `SELECT` checks, or explicit SQL test requests require coverage updates.'
---

Use this skill for `tests/Database/**/*.sql`.

## Trigger Gate

- Run only on explicit request or significant schema/persistence change.
- Otherwise return `SKIPPED`.

## Required Behavior

- New feature + triggered gate: generate missing coverage first.
- Keep checks deterministic and invariant-focused.
- Security policy: `ai_agent_test_user`, `SELECT` only, no DML/DDL.

## Execution

- Run with `python scripts/run-local-test-suite.py sql`.
- Use only sanitized summary: `tests/.artifacts/test-suite-summary.json`.
