---
applyTo: "app/AutoService.WebUI/**"
description: "Use when editing React frontend, API integration, routing, and UI state in AutoService.WebUI."
---
# WebUI Instructions

## Persona
- Frontend: Gergely
- Architecture sign-off: Patrik
- QA/security: Zsombor

## Enforce
- React/TS/Tailwind only.
- i18n for all user text (`en.ts`, `hu.ts`).
- Dark/light parity + responsive behavior.
- Keep service calls in `src/services`; no hardcoded `VITE_API_URL` fallback.
- Preserve auth/session, route guards, scheduler core behavior.

## Engineering Standards
- Apply SOLID and OOP to component/hook/service boundaries.
- Avoid oversized smart components; distribute logic into hooks/services/utils.
- Use appropriate GoF patterns (for example Strategy/Adapter/Factory) when they improve extensibility.
- Document engineering rationale for non-trivial UI architecture decisions.

## Decomposition Guardrails
- No god files/components/hooks.
- Source files > 500 lines must be split.
- Test files > 250 lines must be split.
- Components/hooks/services > 300 lines must be split by responsibility.
- Functions should be <= 60 lines where practical.

## Routing Gates
- Heavy test agents only on explicit request or significant UI/DTO-visible structural change.
- Heavy test triggered by new feature -> generate missing coverage first.

## Always-On
- `docs-sync` always, auto-remediate docs drift.
- `coding-principles` always for class/method changes, auto-remediate quality drift.
- Frontend security remediation in workflow:
  - `npm audit fix`
  - re-run build/type checks.
