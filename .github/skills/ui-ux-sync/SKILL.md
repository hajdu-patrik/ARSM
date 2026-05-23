---
name: ui-ux-sync
description: 'Enforce ARSM WebUI UI/UX policy with evidence-backed audits. Use when frontend UI code, responsive 320px behavior, button settings, animations, i18n text, toast/popup flows, push-notification readiness, or ui-ux-style-profile agent/skill docs change. Keywords: frontend audit, UI UX analysis, 320px, toast, popup, push notification.'
---

Use this skill for UI-facing frontend changes and UI/UX policy documentation updates.

## Trigger Signals

- UI component/layout/interaction change.
- Localization-visible text change.
- Toast/modal/confirmation flow change.
- 320px responsive verification request.
- UI/UX policy file change in `.github/**` or `.claude/**`.

## Mandatory Checks

- Token usage and surface consistency; no shadows.
- Button/control-group mapping to shared style primitives.
- Icon-only controls keep scale-only hover behavior.
- Vehicle action icon semantics remain fixed (Eye info, Pencil warning, Trash danger).
- 320px responsive checklist pass/fail per changed component.
- Localization completeness for any new visible text.
- Toast and confirmation-popup policy adherence.
- Push-notification status explicitly reported (`implemented`, `not-implemented`, `required-missing`).

## Evidence Anchors

- `app/AutoService.WebUI/src/styles/tokens.css`
- `app/AutoService.WebUI/src/utils/styles/{buttonStyles,fieldStyles,surfaceStyles,textStyles}.ts`
- `app/AutoService.WebUI/src/utils/formStyles.ts`
- `app/AutoService.WebUI/src/components/common/{Modal.tsx,ModalCloseButton.tsx,ToastViewport.tsx}`
- `app/AutoService.WebUI/src/utils/locales/{en.core.ts,hu.core.ts,en.feature.ts,hu.feature.ts}`

## Output Contract

1. Scope
2. Dimension results (PASS/FAIL/WARN)
3. 320px checklist (per component)
4. Evidence (file + line)
5. Push status
6. Remediation plan
7. Validation summary
