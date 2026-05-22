# AutoService.WebUI Rules

## Persona

- Frontend: Gergely
- Architecture sign-off: Patrik
- QA/security: Zsombor

## Enforce

- React/TS/Tailwind only.
- i18n for all user text (`en.ts`, `hu.ts`).
- Dark/light parity + responsive behavior.
- Global clean-design rule: no shadows (`shadow-*`, `dark:shadow-*`, CSS `box-shadow`, `transition-shadow`) on WebUI elements.
- Central UI/UX source of truth: `.claude/agents/ui-ux-style-profile.md`.
- Keep API logic in `src/services`; keep UI logic in pages/components/hooks; no hardcoded `VITE_API_URL` fallback.

## UI/UX Guardrails

- Read `.claude/agents/ui-ux-style-profile.md` before UI-facing edits.
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

## Current UI Contract Anchors

- Customer registry search includes customer fields and related vehicle license plates.
- Customer/vehicle repair history opens in the details panel/split-view flow; do not restore the old vehicle-history eye accordion.
- Scheduler intake supports email, exact license plate, and name multi-result lookup; nested vehicle payloads use VIN, kW, and drivetrain fields.

## Testing/Execution Policy

- `http-endpoint-test`: explicit request or significant API endpoint/contract behavior change.
- `sql-database-test`: explicit request or significant schema/persistence behavior change.
- `e2e-playwright-test`: explicit request or significant frontend structural/UI flow change.
- If a heavy test agent is triggered by a new feature: generate missing coverage first.
- Use `python scripts/run-local-test-suite.py playwright` for E2E execution and inspect `tests/.artifacts/test-suite-summary.json` before reporting failures.
- Use `python scripts/run-local-test-suite.py all` for full local test validation; never publish raw `.secrets`, `.env`, trace paths, or unsanitized command output.

## Always-On

- `docs-sync` always, auto-remediate docs drift.
- `coding-principles` always for class/method changes, auto-remediate quality drift.
- Frontend security remediation in workflow:
  - `npm audit fix`
  - re-run build/type checks.

## Mandatory UI/UX Co-Execution (Non-Negotiable)

- After every UI-facing edit iteration, `ui-ux-style-profile` agent must be **co-executed** — not just consulted — alongside or immediately after the `frontend` agent.
- `ui-ux-style-profile` must run the **320px Mandatory Validation Checklist** (defined in `.claude/agents/ui-ux-style-profile.md`) and produce a written per-component pass/fail report for every changed UI file.
- Any 320px failure blocks the iteration: remediate first, re-verify, then sign off.
- Never mark a UI change as complete without an explicit written 320px validation report.

## Operational Anchors (Runtime Behavior)

- **i18n**: `i18next` with `LanguageDetector` and `initReactI18next`, reads from `localStorage` key `preferred-language` (default/fallback: `hu`). Translation resources in `src/utils/locales/en.ts` and `src/utils/locales/hu.ts`.
- **Theme**: `useThemeStore` from `src/store/theme.store.ts`, persists theme preference to `localStorage`.
- **API client**: `apiClient` from `src/services/http/api.client.ts`, reads `VITE_API_URL` from environment (no hardcoded fallback), includes automatic 401 refresh interceptor with single-flight deduplication, redacts login password from Axios error config before propagation.
- **Auth session restoration**: `authService.restoreAuth()` runs on mount in `App.tsx` to restore session state from server-side validation.
- **Routing**: `App.tsx` defines route structure with lazy-loaded pages, `PrivateRoute`/`AdminRoute`/`PublicOnlyRoute` guards, and `SidebarLayout` for authenticated shell.

## Source-of-Truth Files

- Routes: `src/App.tsx`
- i18n: `src/utils/i18n.ts`, `src/utils/locales/en.ts`, `src/utils/locales/hu.ts`
- Theme/state: `src/store/theme.store.ts`, `src/store/auth.store.ts`
- API client: `src/services/http/api.client.ts`
- Auth/session: `src/services/auth/auth.service.ts`
- Shared styles/primitives: `src/index.css`, `src/styles/tokens.css`, `src/styles/base.css`, `src/styles/components.css`, `src/styles/design-system.css`, `src/utils/formStyles.ts` (barrel), `src/utils/styles/{buttonStyles,fieldStyles,surfaceStyles,textStyles}.ts`
- SEO shell/assets: `index.html`, `src/components/seo/SeoManager.tsx`, `public/robots.txt`, `public/sitemap.xml`, `public/site.webmanifest`
- Authenticated shell/sidebar: `src/components/layout/SidebarLayout.tsx`, `src/components/layout/SidebarContent.tsx`
- UI/UX policy: `.claude/agents/ui-ux-style-profile.md`
- Services/stores: `src/services/**`, `src/store/**`
