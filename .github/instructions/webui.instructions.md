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
- Global clean-design rule: no shadows (`shadow-*`, `dark:shadow-*`, `box-shadow`, `transition-shadow`) on WebUI elements.
- Central UI/UX source of truth: `.github/agents/ui-ux-style-profile.agent.md`.
- Keep API logic in `src/services`; keep UI logic in pages/components/hooks; no hardcoded `VITE_API_URL` fallback.

## UI/UX Guardrails
- Read `.github/agents/ui-ux-style-profile.agent.md` before UI-facing edits.
- Treat the central profile as authoritative for tokens, interaction clarity and choice control, 320px mobile-first containment, feedback latency, error recovery, accessibility ergonomics, surface flattening, content-alignment contract, toast feedback, and confirmation-modal policy.
- Do not duplicate or override central profile details here; update the central profile first, then sync wrappers/instructions for parity.

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

## Always-On
- `docs-sync` always, auto-remediate docs drift.
- `coding-principles` always for class/method changes, auto-remediate quality drift.
- Frontend security remediation in workflow:
  - `npm audit fix`
  - re-run build/type checks.

## Mandatory UI/UX Co-Execution (Non-Negotiable)
- After every UI-facing edit iteration, `ui-ux-style-profile` agent must be **co-executed** — not just consulted — alongside or immediately after the `Frontend Specialist`/`frontend` agent.
- `ui-ux-style-profile` must run the **320px Mandatory Validation Checklist** (defined in `.github/agents/ui-ux-style-profile.agent.md`) and produce a written per-component pass/fail report for every changed UI file.
- Any 320px failure blocks the iteration: remediate first, re-verify, then sign off.
- Never mark a UI change as complete without an explicit written 320px validation report.

## Source-of-Truth Files
- Routes: `src/App.tsx`
- Shared styles/primitives: `src/index.css`, `src/styles/tokens.css`, `src/styles/base.css`, `src/styles/components.css`, `src/styles/design-system.css`, `src/utils/formStyles.ts`
- SEO shell/assets: `index.html`, `src/components/seo/SeoManager.tsx`, `public/robots.txt`, `public/sitemap.xml`, `public/site.webmanifest`
- Authenticated shell/sidebar: `src/components/layout/SidebarLayout.tsx`, `src/components/layout/SidebarContent.tsx`
- UI/UX policy: `.github/agents/ui-ux-style-profile.agent.md`
- Services/stores: `src/services/**`, `src/store/**`
