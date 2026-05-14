---
name: autoservice-ef-migration
description: 'Run the ARSM EF Core migration workflow. Use when ApiService entities, DbContext mappings, relationships, indexes, constraints, nullability, or migration files indicate a schema delta.'
disable-model-invocation: true
---

Use this skill for EF migration workflows in `app/AutoService.ApiService`.

## Trigger Gate (mandatory)
Run only if schema/EF delta exists.
No schema delta -> return `SKIPPED`.

## Schema Delta Decision Checklist
- Entity property/relationship/index/constraint changes exist.
- DbContext model configuration changed in a schema-impacting way.
- Current behavior cannot run correctly without a new migration.
- Change is not documentation/refactor-only.

## Default Flow
1. Verify model delta in entities/DbContext.
2. Create migration in `Data/Migrations`.
3. Review generated migration for unexpected destructive operations.
4. Apply migration.
5. Build and report impact.

## Safety
- Destructive reset only with explicit user approval.
- Preserve core invariants (TPH, Identity linkage, constraints).
- Do not rewrite shared migration history unless explicitly approved.

## Generated Migration Review Checklist
- Migration name is clear and domain-oriented.
- Operations match intended schema change only.
- No accidental drop/rename side effects without explicit rationale.
- Snapshot changes align with expected model state.

## Key Commands
- `dotnet ef migrations add <Name> --project AutoService.ApiService --startup-project AutoService.ApiService --output-dir Data/Migrations`
- `dotnet ef database update --project AutoService.ApiService --startup-project AutoService.ApiService`

## Reporting
- If skipped: return explicit reason and what evidence was checked.
- If executed: report migration name, changed schema objects, validation result, and residual risks.
