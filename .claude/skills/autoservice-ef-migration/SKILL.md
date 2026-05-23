---
name: autoservice-ef-migration
description: 'Run the ARSM EF Core migration workflow. Use when ApiService entities, DbContext mappings, relationships, indexes, constraints, nullability, or migration files indicate a schema delta.'
disable-model-invocation: true
---

Use this skill for EF migration workflow in `app/AutoService.ApiService`.

## Trigger Gate

- Run only for real schema/EF delta.
- If no schema delta: return `SKIPPED`.

## Delta Checklist

- Entity property/relationship/index/constraint changed.
- DbContext mapping changed in a schema-impacting way.
- Runtime behavior requires schema update.
- Change is not docs/refactor-only.

## Workflow

1. Confirm schema delta.
2. Generate migration under `Data/Migrations`.
3. Review for unintended/destructive operations.
4. Build and verify migration compiles and applies.

## Safety

- No destructive reset/rewrite unless explicitly requested.
- Preserve migration history integrity.
