---
name: ui-ux-style-profile
description: Authoritative Copilot UI/UX policy for AutoService.WebUI. Enforces tokens, responsiveness, interaction clarity, accessibility, feedback loops, and popup/toast behavior.
tools:
  - read
  - edit
  - search
---

# ARSM UI/UX Style Profile

## Scope and Authority

- Scope: `app/AutoService.WebUI/**`
- This file is the Copilot UI/UX source of truth.
- Claude counterpart: `.claude/agents/ui-ux-style-profile.md`.
- Both files must stay semantically equivalent.

## Mandatory Audit Dimensions

1. Token and surface consistency.
2. Button/control-group consistency.
3. Motion and reduced-motion behavior.
4. i18n completeness and language-switch correctness.
5. 320px responsive behavior.
6. Shared primitive usage.
7. Toast + modal feedback loops.
8. Push-notification implementation status.

## Hard Contracts

- No shadows (`shadow-*`, `dark:shadow-*`, CSS `box-shadow`, `transition-shadow`).
- Modal shell default keeps top-right close button visible (`showCloseButton=true`); hide only on explicitly approved blocking flows.
- Close paths must remain: top-right X, overlay, Escape, explicit cancel.
- User-facing errors/toasts must be localized; no raw backend text in HU mode.
- 320px is the required responsive floor.

## ARSM Button and Action Matrix

- Primary submit/save maps to `buttonClass`, `.arsm-btn-primary`, and `customersToolbarPrimaryButtonClass`.
- Neutral/cancel maps to `secondaryButtonClass`, `.arsm-btn-secondary`, and `customersToolbarNeutralButtonClass`.
- Destructive maps to `dangerButtonClass`, `.arsm-btn-danger`, and `customersToolbarDangerButtonClass`.
- Contextual actions must use `referenceChip*` or `compactFilterChip*` families.
- Icon-only controls must use shared icon families (`iconButtonClass`, `schedulerNavIconButtonClass`, `modalConfirmCloseButtonClass`, `inputGroupOverlayButtonClass`, `iconDangerButtonClass`).
- Scheduler inline claim/unassign must use `schedulerInlineClaimButtonClass` and `schedulerInlineUnassignButtonClass`.

## Interaction and Color Contracts

- Icon-only hover is scale-only; do not add hover background-fill dependencies.
- Non-icon controls use shared micro-interaction primitives.
- Compact/contextual actions remain touch-safe (`min-h-11`; scheduler inline also `min-w-11`).
- Vehicle action icon semantics are fixed: Eye=info, Pencil=warning, Trash=danger.
- Read/display surfaces and toast backgrounds must align to shared input/surface tone; semantic feedback stays in border/text tokens.

## Required Evidence Anchors

- `app/AutoService.WebUI/src/styles/tokens.css`
- `app/AutoService.WebUI/src/utils/styles/{buttonStyles,fieldStyles,surfaceStyles,textStyles}.ts`
- `app/AutoService.WebUI/src/utils/formStyles.ts`
- `app/AutoService.WebUI/src/components/common/{Modal.tsx,ModalCloseButton.tsx,ToastViewport.tsx}`
- `app/AutoService.WebUI/src/utils/locales/{en.core.ts,hu.core.ts,en.feature.ts,hu.feature.ts}`

## 320px Mandatory Checklist

- [ ] New flex/grid rows use `min-w-0`.
- [ ] Dynamic text uses `truncate` or explicit line clamp.
- [ ] Fixed actions/icons use `shrink-0`.
- [ ] Dense action rows use wrap or narrow-width fallback before overflow.
- [ ] Selects are in bounded wrappers (`min-w-0 overflow-hidden`, control `w-full max-w-full min-w-0`).
- [ ] No unintended horizontal page scroll.
- [ ] Forms collapse to single column when needed at 320px.
- [ ] Status/tag/calendar rows are bounded (`max-w-full overflow-hidden`).
- [ ] New interactive targets are at least 44x44.
- [ ] Visual refactors include explicit 320px validation notes for grouped controls, modal footers, selects, and input overlays.

## Required Output Schema

1. `Scope`
2. `Dimension Results` (PASS/FAIL/WARN)
3. `320px Checklist` (per component)
4. `Evidence` (file + line)
5. `Push Status` (`implemented` | `not-implemented` | `required-missing`)
6. `Remediation Plan`
7. `Validation`

## Enforcement

- Must co-run with `Frontend Specialist` on every UI-facing iteration.
- Any failed mandatory check blocks sign-off until remediated.
