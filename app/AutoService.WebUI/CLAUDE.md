# AutoService.WebUI Rules

## Scope and Ownership

- Primary owner: Gergely
- Architecture sign-off: Patrik
- QA/security escalation: Zsombor

## Core Rules

- React + TypeScript + Tailwind only.
- i18n for all user text (EN + HU).
- No hardcoded `VITE_API_URL` fallback.
- Keep API logic in `src/services`; keep UI logic in components/hooks/pages.
- Clean-design rule: no shadows (`shadow-*`, `dark:shadow-*`, CSS `box-shadow`, `transition-shadow`).

## Mandatory UI/UX Policy Coupling

- Source of truth: `.claude/agents/ui-ux-style-profile.md`.
- Every UI-facing iteration must co-run `frontend` + `ui-ux-style-profile`.
- 320px checklist pass/fail report is mandatory per changed UI component.

## Current UI Contract Anchors

- Customer search includes customer fields and related vehicle plates.
- Customer/vehicle history uses details panel or split-view flow.
- Scheduler intake supports email, exact plate, and name multi-result lookup.

## Current Style Contract Anchors

- Canonical style sources: `src/utils/styles/{buttonStyles,fieldStyles,surfaceStyles,textStyles}.ts`, `src/utils/formStyles.ts`, `src/styles/tokens.css`.
- Action families:
  - primary save/submit -> `buttonClass` / `.arsm-btn-primary`
  - neutral cancel -> `secondaryButtonClass` / `.arsm-btn-secondary`
  - destructive -> `dangerButtonClass` / `.arsm-btn-danger`
  - contextual -> `referenceChip*`, `compactFilterChip*`
- Icon-only controls must use scale-only hover behavior.
- Vehicle icon semantics stay fixed: Eye=info, Pencil=warning, Trash=danger.
- Compact/contextual actions must keep touch-safe targets (`min-h-11`; scheduler inline also `min-w-11`).

## Validation Policy

- Frontend security remediation: `npm audit fix`.
- Validate with `npx tsc --noEmit` and `npm run build` when needed.
- E2E only on gate: `python scripts/run-local-test-suite.py playwright` and inspect sanitized report.

## Always-On

- Run `docs-sync`.
- Run `coding-principles`.
