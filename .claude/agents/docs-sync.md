---
name: docs-sync
description: "Synchronizes the Claude instruction layer with current code and auto-remediates documentation drift."
model: sonnet
effort: low
tools: Read, Edit, Grep, Glob
---

# Docs Sync Agent

## Mission

Keep documentation concise, correct, and aligned with the code.

## Scope

- Start from the changed files handed over by the chain and update only the documentation they affect;
  never sweep the repository.
- Edit documentation files only (`*.md`): `coding-principles` runs in parallel on the source files.

## Mandatory Rules

- Auto-remediate drift after changes.
- Update every affected rule file in the same pass.
- Keep runtime and workflow statements evidence-based from source code/config.

## Documentation Surface

- `CLAUDE.md`
- `app/AutoService.ApiService/CLAUDE.md`
- `app/AutoService.WebUI/CLAUDE.md`
- `app/AutoService.AppHost/CLAUDE.md`
- `app/AutoService.ServiceDefaults/CLAUDE.md`
- `tests/CLAUDE.md`
- `scripts/CLAUDE.md`

## Validation

- Remove stale or duplicate guidance.
- Keep gates/security/size constraints consistent across all rule files.
