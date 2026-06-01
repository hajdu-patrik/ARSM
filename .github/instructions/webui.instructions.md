---
applyTo: 'app/AutoService.WebUI/**'
description: 'Use when editing React frontend UI, routing, stores, and frontend integration contracts.'
---
# WebUI Instructions

## Scope and Ownership

- Primary owner: Gergely
- Architecture sign-off: Patrik
- QA/security escalation: Zsombor

## Decision Ownership

- The user owns frontend product, UX, interaction, style, routing, copy, and behavior decisions.
- Do not add or change UI behavior, visual style, layout, text, feedback flows, tests, documentation policy, abstractions, or shared style primitives unless explicitly requested, specified by instructions, or agreed in the active plan.
- If frontend requirements are ambiguous, ask the user before choosing an approach.

## Core Rules

- React + TypeScript + Tailwind only.
- i18n for all user-visible text (EN + HU).
- No hardcoded `VITE_API_URL` fallback.
- Vite dev server binds to `localhost` by default; use `VITE_DEV_HOST` only for explicit local opt-in.
- Keep API logic in `src/services`; keep UI logic in components/hooks/pages.
- Private authenticated read models use TanStack Query with person/role-scoped keys, sessionStorage persistence, and cache clearing on auth-boundary transitions.
- Clean-design rule: no shadows (`shadow-*`, `dark:shadow-*`, CSS `box-shadow`, `transition-shadow`).
- Style-system work is visual-preserving by default. Do not change current colors, spacing, radii, motion, focus, layout, or responsive behavior unless the user explicitly requests a redesign.

## Mandatory Policy Coupling

- Source of truth: `.github/agents/ui-ux-style-profile.agent.md`.
- UI, UI/UX, responsiveness, interaction, style-token, and style-architecture changes must co-run `Frontend Specialist` and `ui-ux-style-profile`.
- `Frontend Specialist` implements behavior and local composition; `ui-ux-style-profile` audits visual consistency, extraction boundaries, accessibility, feedback loops, and 320px behavior.
- Iterate until implementation and UI/UX audit both pass.

## UI Contract Anchors

- Customer search includes customer fields and related vehicle plates.
- Customer/vehicle history stays in details panel/split-view flow.
- Scheduler intake keeps email, exact plate, and name multi-result lookup.
- Scheduler and customer reads keep query-cache stale times, visible-tab background refresh, and mutation invalidation behavior aligned with `src/services/cache`.

## Style Contract Anchors

- Canonical style sources: `src/utils/styles/{buttonStyles,fieldStyles,surfaceStyles,textStyles}.ts`, `src/utils/formStyles.ts`, `src/styles/tokens.css`.
- Extract only the repeated minimum common subset: geometry, base layout, radius, focus, motion, disabled state, typography, and reusable responsive wrappers.
- Keep feature-specific color, state, placement, spacing, icons, and rare variants local in the owning TS/TSX file or feature module.
- Compose component styles by importing a small shared base and adding local semantic classes in `className`.
- Do not create global style exports for one-off or domain-specific details.
- Icon-only controls must use scale-only hover behavior.
- Vehicle icon semantics stay fixed: Eye=info, Pencil=warning, Trash=danger.
- Interactive controls must preserve existing touch targets and 320px behavior.

## Validation and Security

- Frontend security remediation: `npm audit fix`.
- Validate with `npx tsc --noEmit` and `npm run build` when needed.
- Style refactors need before/after visual preservation evidence for affected surfaces, including 320px when layout can wrap.
- E2E only on gate: `python scripts/run-local-test-suite.py playwright` and inspect sanitized report.
- Always run `docs-sync` and `coding-principles`.
