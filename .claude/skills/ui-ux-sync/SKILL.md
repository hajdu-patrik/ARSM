---
name: ui-ux-sync
description: Enforce the central ARSM UI/UX style profile across WebUI source, agent wrappers, toast behavior, responsive overflow rules, and docs.
disable-model-invocation: true
---

Use this skill after UI-facing frontend changes or agent/documentation changes that affect WebUI styling policy.

## Source Of Truth

- Read `.claude/agents/ui-ux-style-profile.md` (authoritative Claude policy) first.
- Copilot equivalent: `.github/agents/ui-ux-style-profile.agent.md`.
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
3. Interaction clarity and choice control: one dominant primary action per surface, no unlabeled icon-only critical actions, overflow extra secondary actions, and use progressive disclosure for advanced controls.
4. 320px containment: verify dynamic flex/grid rows use `min-w-0`, `truncate` or line clamp, and `shrink-0` on fixed actions/icons.
5. Dropdown safety: selects and filter controls need `min-w-0 overflow-hidden` parents plus `w-full max-w-full min-w-0 truncate` on the control.
6. Surface flattening: remove card-inside-card structures unless a nested card is the primary repeated object.
7. Toast feedback: mutations should emit top-center success/error toast feedback through existing toast infrastructure.
8. Confirmation flow: destructive/high-stakes mutations must use confirmation modal flow with i18n copy and semantic tokens. Exception: scheduler quick self-unassign from list cards may remain direct with backend invariants and toast feedback.
9. Modal close policy: Modal-based confirmations must not require an X close icon; explicit cancel, overlay, and Escape remain valid exits. Toast dismiss X remains valid.
10. Feedback latency: for operations over 400ms show explicit pending feedback near trigger and prevent duplicate submissions; keep action layout stable while pending.
11. Error recovery: failed submit should focus first invalid field, keep localized actionable guidance, and preserve entered data unless sensitive-field clearing is required.
12. Accessibility ergonomics: preserve visible focus, keyboard parity, minimum 44x44px touch targets, and avoid contrast regressions.
13. Mobile-first responsiveness: narrow-width baseline first, collapse dense forms to single column when needed, and avoid unintended horizontal page scroll.
14. Content alignment consistency: equivalent empty/loading/error/info states within the same block must use a consistent alignment mode (default centered for placeholder states).

## Remediation Rules

- Prefer existing shared primitives, style utilities, and services.
- Make narrow class-level changes for layout drift.
- Do not alter API contracts, auth guards, or persistence behavior while fixing visual policy.
- When docs drift is found, update the paired Claude/Copilot files in the same pass.

## Validation

- Run the frontend build or type-check after source edits.
- For WebUI source changes, run `npm audit fix` before final validation.
- Report any remaining policy exceptions with file paths and rationale.