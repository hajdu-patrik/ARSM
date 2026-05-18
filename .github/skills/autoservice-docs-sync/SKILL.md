---
name: autoservice-docs-sync
description: 'Synchronize ARSM CLAUDE/.github instruction pairs, agents, skills, MCP templates, README docs, and workflow policy. Use when repository behavior, setup, governance, routing gates, or documentation/customization files change.'
---

Use this skill after any repository change that can affect documented behavior.

## Persona Context
- Primary owner: Patrik
- Domain verification support: Mark, Gergely, Zsombor

## Mandatory Behavior
- Always run docs synchronization after changes.
- Auto-remediate documentation drift (not report-only).
- Keep `.claude/**` and `.github/**` policy-equivalent.

## Source-of-Truth Pairs
- `CLAUDE.md` <-> `.github/copilot-instructions.md`
- `app/AutoService.ApiService/CLAUDE.md` <-> `.github/instructions/apiservice.instructions.md`
- `app/AutoService.WebUI/CLAUDE.md` <-> `.github/instructions/webui.instructions.md`
- `app/AutoService.AppHost/CLAUDE.md` <-> `.github/instructions/apphost.instructions.md`
- `app/AutoService.ServiceDefaults/CLAUDE.md` <-> `.github/instructions/servicedefaults.instructions.md`
- `tests/CLAUDE.md` <-> `.github/instructions/tests.instructions.md`

## Snapshot Consolidation Policy
- Avoid keeping monolithic project-state documents as primary operational truth when the same knowledge can live in active governance layers.
- When a snapshot is >=80% redundant with current instruction/agent/skill files:
	1. extract and migrate the remaining unique operational deltas,
	2. update both Claude and Copilot counterparts in the same pass,
	3. remove the redundant snapshot file.
- Minimum deltas to preserve during migration:
	- runtime endpoint/port matrix,
	- session cookie and auth timing/rate-limit contract,
	- middleware/auth denylist checkpoints,
	- appointment contract checkpoints,
	- profile-picture cache/ETag/SSE checkpoints,
	- AppHost and seed/bootstrap checkpoints.

## Workflow
1. Detect changed areas (backend/frontend/apphost/servicedefaults/tests/agents/skills/instructions).
2. Read source files/configs that define runtime truth; do not infer behavior.
3. Update paired docs in the same pass for every affected surface.
4. If setup/operational behavior changed, update `README.md` and `README(HU).md` consistently.
5. Ensure gate language remains aligned (heavy-test gate, migration gate, security remediation stage).
6. Keep edits concise, factual, and implementation-actionable.

## Validation Checklist
- Facts reflect current code.
- Counterpart docs are aligned.
- Workflow order is not contradicted across files.
- Guardrails (SOLID/OOP/GoF + size limits) remain consistently documented.
- No speculative or stale statements remain.
- If snapshot consolidation was performed, the removed file's essential deltas exist in managed instruction/agent/skill layers on both Claude and Copilot sides.
