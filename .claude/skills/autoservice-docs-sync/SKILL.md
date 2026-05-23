---
name: autoservice-docs-sync
description: 'Synchronize ARSM CLAUDE/.github instruction pairs, agents, skills, MCP templates, README docs, and workflow policy. Use when repository behavior, setup, governance, routing gates, or documentation/customization files change.'
disable-model-invocation: true
---

Use this skill after any change that can affect documented behavior.

## Mandatory Behavior

- Always run docs synchronization.
- Auto-remediate drift; do not report-only.
- Keep `.claude/**` and `.github/**` semantically equivalent.
- Keep docs concise and evidence-based from current code/config.

## Required Pair Mapping

- Root policy: `CLAUDE.md` <-> `.github/copilot-instructions.md`.
- Area rules: `app/{AutoService.ApiService,AutoService.WebUI,AutoService.AppHost,AutoService.ServiceDefaults}/CLAUDE.md` <-> `.github/instructions/{apiservice,webui,apphost,servicedefaults}.instructions.md`.
- Tests: `tests/CLAUDE.md` <-> `.github/instructions/tests.instructions.md`.
- Scripts: `scripts/CLAUDE.md` <-> `.github/instructions/scripts.instructions.md`.

## Agent and Skill Parity

- Keep all `.github/agents/*.agent.md` and `.claude/agents/*.md` policy-equivalent.
- Keep all `.github/skills/*/SKILL.md` and `.claude/skills/*/SKILL.md` policy-equivalent.

## Output Contract

- Files synchronized.
- Drift remediations made.
- Any unresolved ambiguity requiring human decision.
