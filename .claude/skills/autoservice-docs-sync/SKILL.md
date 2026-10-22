---
name: autoservice-docs-sync
description: 'Synchronize the ARSM Claude instruction files, agents, skills, MCP templates, README docs, and workflow policy. Use when repository behavior, setup, governance, routing gates, or documentation/customization files change.'
disable-model-invocation: true
---

Use this skill after any change that can affect documented behavior.

## Mandatory Behavior

- Always run docs synchronization.
- Auto-remediate drift; do not report-only.
- Keep docs concise and evidence-based from current code/config.

## Required Documentation Surface

- Root policy: `CLAUDE.md`.
- Area rules: `app/{AutoService.ApiService,AutoService.WebUI,AutoService.AppHost,AutoService.ServiceDefaults}/CLAUDE.md`.
- Tests: `tests/CLAUDE.md`.
- Scripts: `scripts/CLAUDE.md`.
- Deployment kits: `deploy/CLAUDE.md`.

## Agent and Skill Coverage

- Keep all `.claude/agents/*.md` and `.claude/skills/*/SKILL.md` consistent with `CLAUDE.md`.

## Output Contract

- Files synchronized.
- Drift remediations made.
- Any unresolved ambiguity requiring human decision.
