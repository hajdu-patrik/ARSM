---
name: ui-ux-sync
description: Enforce the central ARSM UI/UX style profile across WebUI source, agent wrappers, toast behavior, responsive overflow rules, and docs.
disable-model-invocation: true
---

Use this skill after UI-facing frontend changes or agent/documentation changes that affect WebUI styling policy.

## Source Of Truth

- Read `.agents/ui-ux-style-profile.md` first.
- Treat `.github/agents/ui-ux-style-profile.agent.md` and `.claude/agents/ui-ux-style-profile.md` as wrappers only.
- Keep `.github/**` and `.claude/**` semantically equivalent.

## Scan Targets

- `app/AutoService.WebUI/src/**/*.{ts,tsx,css}`
- `app/AutoService.WebUI/CLAUDE.md`
- `.github/instructions/webui.instructions.md`
- `.github/agents/*.agent.md`
- `.claude/agents/*.md`
- `README.md` and `README(HU).md` when agent/skill workflows change.

## Mandatory Checks

1. Token discipline: flag default Tailwind color utilities where an `arsm-*` token should be used.
2. Shadow ban: flag `shadow-*`, `dark:shadow-*`, CSS `box-shadow`, and `transition-shadow`.
3. 320px containment: verify dynamic flex/grid rows use `min-w-0`, `truncate` or line clamp, and `shrink-0` on fixed actions/icons.
4. Dropdown safety: selects and filter controls need `min-w-0 overflow-hidden` parents plus `w-full max-w-full min-w-0 truncate` on the control.
5. Surface flattening: remove card-inside-card structures unless a nested card is the primary repeated object.
6. Toast feedback: mutations should emit top-center success/error toast feedback through existing toast infrastructure.
7. Confirmation flow: destructive/high-stakes mutations must use confirmation modal flow with i18n copy and semantic tokens. Exception: scheduler quick self-unassign from list cards may remain direct with backend invariants and toast feedback.
8. Modal close policy: Modal-based confirmations must not require an X close icon; explicit cancel, overlay, and Escape remain valid exits. Toast dismiss X remains valid.

## Remediation Rules

- Prefer existing shared primitives, style utilities, and services.
- Make narrow class-level changes for layout drift.
- Do not alter API contracts, auth guards, or persistence behavior while fixing visual policy.
- When docs drift is found, update the paired Claude/Copilot files in the same pass.

## Validation

- Run the frontend build or type-check after source edits.
- For WebUI source changes, run `npm audit fix` before final validation.
- Report any remaining policy exceptions with file paths and rationale.