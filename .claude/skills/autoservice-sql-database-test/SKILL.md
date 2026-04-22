---
name: autoservice-sql-database-test
description: Sync SQL database validation suites in tests/Database/ after schema or persistence model changes.
disable-model-invocation: true
---

Use this skill whenever persistence model or schema changes affect database validation.

## Goal

Keep SQL validation suites synchronized with the current database schema and persistence model:
- SQL suites in `tests/Database/` (including chunked subfolders)

## Managed test files

- `tests/Database/core-schema/*.sql`
- `tests/Database/identity-auth/*.sql`
- `tests/Database/feature-flow/*.sql`
- `tests/Database/**/*.sql`

## Trigger conditions

Run when any of these change:
- Entity model (`Data/AutoServiceDbContext.cs`, entity classes)
- EF Core migrations (`Data/Migrations/`)
- Persistence model affecting SQL validation semantics
- Identity/auth schema changes

## Workflow

1. Read current entity model and migration state from source code (do not guess).
2. Determine delta: new entity, changed column, new relationship, removed table.
3. Update the correct SQL suite(s):
   - Add new validation queries for schema changes
   - Update existing queries for column/type changes
   - Remove obsolete queries for deleted entities
4. Ensure suite organization stays clean: `core-schema/` for tables/columns, `identity-auth/` for Identity tables, `feature-flow/` for business logic validation.

## Safety rules

- Use `ai_agent_test_user` for all queries.
- Read-only `SELECT` queries only.
- Never include DML/DDL (`INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `ALTER`, `CREATE`, `DROP`, `GRANT`, `REVOKE`).

## Required conventions

- Keep existing test style and comments.
- One validation concern per query where practical.
- Keep query intent clear with comments.
- Do not delete unrelated tests.

## Validation checklist

After updates, confirm:
- [ ] SQL checks cover identity/auth and feature-flow integrity.
- [ ] Schema validation matches current migration state.
- [ ] No stale table/column references remain.
- [ ] All queries use read-only SELECT with `ai_agent_test_user`.

## Reporting

Report: which schema deltas were detected, which `.sql` files were changed, which queries were added/updated/removed.
