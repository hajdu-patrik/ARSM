---
applyTo: 'app/AutoService.WebUI/**'
description: 'Use when editing React frontend UI, routing, stores, and frontend integration contracts.'
---
# WebUI Instructions

## Scope and Ownership

- Primary owner: Gergely
- Architecture sign-off: Patrik
- QA/security escalation: Zsombor

## Core Rules

- React + TypeScript + Tailwind only.
- i18n for all user-visible text (EN + HU).
- No hardcoded `VITE_API_URL` fallback.
- Keep API logic in `src/services`; keep UI logic in components/hooks/pages.
- Clean-design rule: no shadows (`shadow-*`, `dark:shadow-*`, CSS `box-shadow`, `transition-shadow`).

## Mandatory Policy Coupling

- Source of truth: `.github/agents/ui-ux-style-profile.agent.md`.
- UI, UI/UX, responsiveness, interaction, and style-token changes must co-run `Frontend Specialist` and `ui-ux-style-profile`.
- 320px validation checklist with per-component pass/fail report is mandatory.

## UI Contract Anchors

- Customer search includes customer fields and related vehicle plates.
- Customer/vehicle history stays in details panel/split-view flow.
- Scheduler intake keeps email, exact plate, and name multi-result lookup.

## Style Contract Anchors

- Canonical style sources: `src/utils/styles/{buttonStyles,fieldStyles,surfaceStyles,textStyles}.ts`, `src/utils/formStyles.ts`, `src/styles/tokens.css`.
- Action families:
  - primary save/submit -> `buttonClass` / `.arsm-btn-primary`
  - neutral cancel -> `secondaryButtonClass` / `.arsm-btn-secondary`
  - destructive -> `dangerButtonClass` / `.arsm-btn-danger`
  - contextual -> `referenceChip*`, `compactFilterChip*`
- Icon-only controls must use scale-only hover behavior.
- Vehicle icon semantics stay fixed: Eye=info, Pencil=warning, Trash=danger.
- Compact/contextual actions must keep touch-safe targets (`min-h-11`; scheduler inline also `min-w-11`).

## Validation and Security

- Frontend security remediation: `npm audit fix`.
- Validate with `npx tsc --noEmit` and `npm run build` when needed.
- E2E only on gate: `python scripts/run-local-test-suite.py playwright` and inspect sanitized report.
- Always run `docs-sync` and `coding-principles`.
