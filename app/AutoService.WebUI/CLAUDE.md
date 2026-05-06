# AutoService.WebUI Rules

## Persona

- Primary: Gergely (frontend authority)
- Final architecture sign-off: Patrik
- QA/security escalation: Zsombor

## Hard Rules

- React + TypeScript + Tailwind only.
- No hardcoded runtime API fallback URL; use `VITE_API_URL`.
- All user strings in i18n (`en.ts`, `hu.ts`).
- Keep dark/light parity and responsive behavior.
- Keep API logic in `src/services`, UI logic in pages/components/hooks.

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

## Auth/State

- Cookie-session flow with backend authority.
- Preserve route guards and sidebar/nav behavior.
- Preserve scheduler behavior and status-driven rules.

## Testing/Execution Policy

- Heavy test agents (HTTP/SQL/E2E): only explicit request or significant feature/structural behavior change.
- If heavy tests are triggered by new UI/DTO feature: generate missing coverage first.

## Mandatory Always-On

- `docs-sync`: always after changes, auto-remediate docs drift.
- `coding-principles`: always after class/method changes, auto-remediate quality drift.
- Security remediation on frontend code workflows:
  - `npm audit fix`
  - re-run build/type checks.

## Source-of-Truth Files

- Routes: `src/App.tsx`
- Shared styles: `src/utils/formStyles.ts`, `src/index.css`
- Services/stores: `src/services/**`, `src/store/**`
