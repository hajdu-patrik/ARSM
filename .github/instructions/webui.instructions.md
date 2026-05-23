---
applyTo: "app/AutoService.WebUI/**"
description: "Use when editing React frontend UI, routing, stores, and frontend integration contracts."
---
# WebUI Instructions

## Enforce

- React + TypeScript + Tailwind only.
- i18n for all user-visible text (EN + HU).
- No hardcoded `VITE_API_URL` fallback.
- No shadow usage (`shadow-*`, `dark:shadow-*`, CSS `box-shadow`, `transition-shadow`).

## Mandatory Policy Coupling

- Source of truth: `.github/agents/ui-ux-style-profile.agent.md`.
- UI changes must co-run `Frontend Specialist` and `ui-ux-style-profile`.
- 320px validation checklist with per-component pass/fail report is mandatory.

## UI Contract Anchors

- Customer search includes customer fields and related vehicle plates.
- Customer/vehicle history stays in details panel/split-view flow.
- Scheduler intake keeps email, exact plate, and name multi-result lookup.

## Style Contract Anchors

- Canonical sources: `src/utils/styles/{buttonStyles,fieldStyles,surfaceStyles,textStyles}.ts`, `src/utils/formStyles.ts`, `src/styles/tokens.css`.
- Action mapping: primary (`buttonClass`), neutral (`secondaryButtonClass`), danger (`dangerButtonClass`), contextual (`referenceChip*`, `compactFilterChip*`).
- Icon-only controls use scale-only hover behavior.
- Vehicle icon semantics fixed: Eye=info, Pencil=warning, Trash=danger.
- Compact/context actions keep touch-safe sizing.

## Validation and Security

- Frontend code changes: `npm audit fix` + type/build validation.
- E2E runs only by gate; prefer `python scripts/run-local-test-suite.py playwright` and sanitized summary.
- Always run `docs-sync` and `coding-principles`.
