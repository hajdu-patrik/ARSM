---
name: ui-ux-sync
description: 'Enforce ARSM WebUI UI/UX policy with evidence-backed audits. Use when frontend UI code, responsive 320px behavior, button settings, animations, i18n text, toast/popup flows, push-notification readiness, or ui-ux-style-profile agent/skill docs change. Keywords: frontend audit, UI UX analysis, 320px, toast, popup, push notification.'
disable-model-invocation: true
---

Use this skill after UI-facing frontend changes or agent/documentation changes that affect WebUI styling policy.

## When to Use This Skill

- User asks for detailed frontend design analysis.
- UI button configurations or control-group consistency changed.
- Animation behavior or reduced-motion behavior changed.
- Visible texts/localization keys changed in WebUI.
- Toast or popup/confirmation behavior changed.
- 320px responsive quality must be verified.
- Push-notification status/readiness must be assessed.
- `.github` / `.claude` UI/UX policy or skill files are updated and parity is required.

## Source Of Truth

- Read `.claude/agents/ui-ux-style-profile.md` (authoritative Claude policy) first.
- Copilot equivalent: `.github/agents/ui-ux-style-profile.agent.md`.
- Keep `.github/**` and `.claude/**` semantically equivalent.

## UI/UX Evidence Map (Mi Hol Talalhato)

- Token and color source: `app/AutoService.WebUI/src/styles/tokens.css`
- Global import chain root: `app/AutoService.WebUI/src/index.css`
- Shared primitive system and responsive media rules: `app/AutoService.WebUI/src/styles/design-system.css`
- Component-level CSS effects and animations: `app/AutoService.WebUI/src/styles/components.css`
- Base typography/background/focus baseline: `app/AutoService.WebUI/src/styles/base.css`
- Shared JSX class primitives: `app/AutoService.WebUI/src/utils/formStyles.ts`
- Modal shell/close behavior: `app/AutoService.WebUI/src/components/common/Modal.tsx`, `app/AutoService.WebUI/src/components/common/ModalCloseButton.tsx`
- Toast infrastructure: `app/AutoService.WebUI/src/store/toast.store.ts`, `app/AutoService.WebUI/src/components/common/ToastViewport.tsx`, mounted in `app/AutoService.WebUI/src/App.tsx`
- Localization bootstrap: `app/AutoService.WebUI/src/utils/i18n.ts`
- Localization dictionaries: `app/AutoService.WebUI/src/utils/locales/en.core.ts`, `app/AutoService.WebUI/src/utils/locales/hu.core.ts`, `app/AutoService.WebUI/src/utils/locales/en.feature.ts`, `app/AutoService.WebUI/src/utils/locales/hu.feature.ts`
- Customers UX hotspots: `app/AutoService.WebUI/src/pages/Customers/components/VehicleItem.tsx`, `app/AutoService.WebUI/src/pages/Customers/components/HistoryAppointmentModal.tsx`, `app/AutoService.WebUI/src/pages/Customers/components/CustomerListSection.tsx`
- PWA metadata surface: `app/AutoService.WebUI/public/site.webmanifest`
- Push integration checkpoints: `app/AutoService.WebUI/src/main.tsx` and `app/AutoService.WebUI/src/**/*.{ts,tsx}`

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
8. Confirmation flow: destructive/high-stakes mutations must use confirmation modal flow with i18n copy and semantic tokens. Scheduler self-unassign is high-stakes in all surfaces (including list cards) and must never bypass confirmation.
9. Modal close policy: Modal-based confirmations must not require an X close icon; explicit cancel, overlay, and Escape remain valid exits. Toast dismiss X remains valid.
10. Feedback latency: for operations over 400ms show explicit pending feedback near trigger and prevent duplicate submissions; keep action layout stable while pending.
11. Error recovery: failed submit should focus first invalid field, keep localized actionable guidance, and preserve entered data unless sensitive-field clearing is required.
12. Accessibility ergonomics: preserve visible focus, keyboard parity, minimum 44x44px touch targets, and avoid contrast regressions.
13. Mobile-first responsiveness: narrow-width baseline first, collapse dense forms to single column when needed, and avoid unintended horizontal page scroll.
14. Content alignment consistency: equivalent empty/loading/error/info states within the same block must use a consistent alignment mode (default centered for placeholder states).
15. Push-notification assessment: explicitly classify status as `implemented`, `not-implemented`, or `required-missing` by checking service-worker registration and browser push API usage.

## Execution Workflow

1. Read both policy agents, then verify parity before scanning source.
2. Collect changed files and map each file to one or more audit dimensions.
3. Run focused scans for token usage, shadow ban, responsive containment, modal usage, toast usage, localization keys, and push APIs.
4. Inspect shared primitives before approving any page-local class additions.
5. Validate toasts and confirmation popups through shared infrastructure first, then feature wrappers.
6. Run the mandatory 320px checklist with per-component pass/fail entries.
7. Create the required output report schema with evidence links and blocking items.
8. Apply minimal remediations while preserving API/auth/data contracts.
9. Re-run validation commands and report residual risks.

## Required Output Schema

Every run must return this structure:

1. `Scope`: changed files and affected surfaces.
2. `Dimension Results`: PASS/FAIL/WARN across design, buttons, animations, i18n, 320px, components, toast/popup, push.
3. `320px Checklist`: per changed component with explicit pass/fail and blockers.
4. `Evidence`: file paths and line references for each failure/risk.
5. `Push Status`: `implemented` or `not-implemented` or `required-missing` with proof.
6. `Remediation Plan`: concrete fixes ordered by severity.
7. `Validation`: executed commands and outcome summary.

## Remediation Rules

- Prefer existing shared primitives, style utilities, and services.
- Make narrow class-level changes for layout drift.
- Do not alter API contracts, auth guards, or persistence behavior while fixing visual policy.
- When docs drift is found, update the paired Claude/Copilot files in the same pass.

## Validation

- Run the frontend build or type-check after source edits.
- For WebUI source changes, run `npm audit fix` before final validation.
- Report any remaining policy exceptions with file paths and rationale.