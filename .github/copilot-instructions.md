> Architecture Notice: ARSM uses GitHub Copilot + Claude Code. Keep `.github/**` and `.claude/**` policy-equivalent.

# ARSM Copilot Instructions

## Model Selection Policy (Auto Mode)
- In auto/agent mode, **never** automatically select a model that costs more than 3× the baseline tier.
- Forbidden for automatic selection (only allowed when the user explicitly starts the session with that model): `claude-opus-4.7 (any level)` and `gpt-5.5 (any level)`
- Preferred auto-selection pool: `gpt-5.3-codex (high/xhigh)`, `gpt-5.4 (high/xhigh)`, `claude-sonnet 4.6 (high)`, `gemini 3.1 pro`, or equivalent tier models.
- If a task genuinely requires a top-tier model, surface the suggestion to the user and wait for explicit approval before switching.

## Team Identity (Global)
- Elite startup; enterprise-grade delivery standards.
- Patrik (MIT, ex-Google): architecture + final quality authority.
- Mark (MIT, ex-BlackRock/Morgan Stanley): backend/data/scale authority.
- Gergely (Harvard, ex-Netflix/Meta): frontend/UI/UX authority.
- Zsombor (Stanford, ex-Amazon/Oracle): CI/CD, QA, security authority.

## Persona Routing
- Architecture/final approval -> Patrik.
- Backend/API/data -> Mark.
- Frontend/UI/UX -> Gergely.
- Testing/security/validation -> Zsombor.

## Repository Map
- `app/AutoService.ApiService` API/domain/EF.
- `app/AutoService.WebUI` React client.
- `app/AutoService.AppHost` Aspire orchestration.
- `app/AutoService.ServiceDefaults` shared service defaults.

## Stack
- Backend: .NET 10, ASP.NET Core API, EF Core, PostgreSQL.
- Frontend: React 19, TypeScript, Vite, Tailwind.
- Orchestration: .NET Aspire.

## Mandatory Workflow
1. Orchestrator first (`Task Orchestrator`).
2. Conditional implementation routing from orchestrator:
  - backend/platform changes required (`AutoService.ApiService`, `AutoService.AppHost`, `AutoService.ServiceDefaults`, or source-level backend changes) -> run `Backend Specialist`
  - frontend changes required -> run `Frontend Specialist` AND `ui-ux-style-profile` as a **mandatory pair** (never one without the other)
  - `ui-ux-style-profile` must execute the 320px Mandatory Validation Checklist and produce a written per-component report after every `Frontend Specialist` iteration; iteration is blocked until sign-off
  - EF/schema delta only -> run optional `EF Migration`
3. `Build Validator` must always run after implementation.
4. `Docs Sync` always; auto-remediate docs drift.
5. `Coding Principles` must always run for source changes; auto-remediate code-quality drift.
6. Security remediation on every code-change workflow:
  - WebUI touched: `npm audit fix`.
  - Backend/.NET project touched: `dotnet list package --vulnerable --include-transitive`, apply patch/minor updates, recheck.
7. Heavy test agents are conditional (gate below).

## Heavy Test Gate
Run heavy test agents only when explicitly requested by the user, or when the agent-specific trigger applies:
- `http-endpoint-test`: significant API endpoint, contract, auth/role, status, or validation behavior change.
- `sql-database-test`: significant schema, migration, persistence, seed-data, or integrity invariant change.
- `e2e-playwright-test`: significant frontend structural/UI flow or user-visible journey change; backend-only changes do not trigger Playwright unless explicitly requested.

When triggered by a new feature:
- auto-generate missing test coverage,
- then execute/update tests.

## Migration Isolation Gate
Run `EF Migration` only for actual schema/EF migration deltas.
No schema delta -> migration agent must skip.

## Engineering Principles (Mandatory)
- Enforce SOLID (SRP, OCP, LSP, ISP, DIP) in architecture and implementation.
- Apply OOP fundamentals: explicit responsibilities, low coupling, high cohesion.
- Use GoF 23 patterns intentionally where they reduce complexity and improve extensibility.
- Avoid pattern overuse without measurable benefit.
- Require engineering rationale for non-trivial decisions: why this design, why not alternatives, and impact on scalability/maintainability.

## Scalability & Maintainability Guardrails
- No god files/classes/methods.
- Source files:
  - preferred <= 350 lines,
  - hard limit: > 500 lines must be split.
- Test files:
  - preferred <= 180 lines,
  - hard limit: > 250 lines must be split.
- Class/service files:
  - preferred <= 220 lines,
  - hard limit: > 300 lines must be split by responsibility.
- Method/function target: <= 60 lines where practical.

## Credentials & Secrets Policy (Mandatory)
- Never hardcode credentials, passwords, connection strings, hosts, or tokens in source/tests/scripts/agent output.
- Secret sources (gitignored):
  - `.secrets` (repo root): E2E/Playwright runtime env (`set -a && source .secrets && set +a` before `npx playwright test`).
  - `tests/.env`: HTTP `.http` tests via `{{$processEnv VAR_NAME}}`.
- Template: `tests/.env.example` (placeholder values only).
- Key vars: `ARSM_TEST_MECHANIC_EMAIL`, `ARSM_TEST_MECHANIC_PASSWORD`, `ARSM_TEST_ADMIN_EMAIL`, `ARSM_TEST_ADMIN_PASSWORD`, `ARSM_TEST_CUSTOMER_EMAIL`, `ARSM_TEST_PASSWORD`, `ARSM_TEST_WRONG_PASSWORD`, `ARSM_TEST_MECHANIC_NEW_PASSWORD`, `AutoService_ApiService_HostAddress`, optional `ARSM_E2E_*` aliases.
- Agent rules:
  - HTTP/SQL tests: env vars only (`{{$processEnv ...}}`), never literal credentials.
  - E2E tests: credentials only from `app/AutoService.WebUI/tests/e2e/support/e2e-env.ts` (`getAppointmentFlowEnv`, `getAdminFlowEnv`) when the WebUI E2E suite is present.
  - EF migrations/seed scripts: no embedded connection strings; use `appsettings.Local.json` (gitignored) or env injection.
  - Playwright command instructions must include `.secrets` preamble.
  - Missing variable: report exact name and point to `tests/.env.example` or `.secrets`; never guess.

## Core Rules
- Config-first endpoints/ports; no runtime localhost fallback in code.
- WebUI UI/UX policy source of truth: `.github/agents/ui-ux-style-profile.agent.md` (Copilot) / `.claude/agents/ui-ux-style-profile.md` (Claude); both files must remain policy-equivalent.
- WebUI clean-design rule: no shadows (`shadow-*`, `dark:shadow-*`, CSS `box-shadow`, `transition-shadow`) across UI elements.
- Preserve backend invariants: People abstract TPH, Identity link via `People.IdentityUserId`, DTO-only API boundaries.
- AI SQL safety: `ai_agent_test_user`, `SELECT` only, no DML/DDL.
- Keep `.github` and `.claude` agent+skill logic aligned.

## Scoped Instruction Files
- `.github/instructions/apiservice.instructions.md`
- `.github/instructions/webui.instructions.md`
- `.github/instructions/apphost.instructions.md`
- `.github/instructions/servicedefaults.instructions.md`
- `.github/instructions/tests.instructions.md`

## Operational Anchors (Consolidated)
- Keep operational knowledge distributed across instruction/agent/skill layers; do not rely on a single long-form TL-DR document as primary runtime truth.
- Canonical local runtime surface:
  - Aspire dashboard: `https://localhost:17094`
  - API: `https://localhost:5200`
  - WebUI: `https://localhost:5173`
  - PostgreSQL: `localhost:50000`
- Session/auth contract anchors:
  - Access cookie: `autoservice_at` (10 minutes)
  - Refresh cookie: `autoservice_rt` (7 days)
  - Login rate limit: `10/min per IP`; refresh rate limit: `20/min per IP`
  - Lockout: 5 failed password attempts -> 15 minutes
- Runtime behavior anchors that must stay docs-synced when changed:
  - Middleware order and denylist enforcement in `app/AutoService.ApiService/Program.cs`
  - Auth/session endpoint behavior under `app/AutoService.ApiService/Auth/**`
  - Appointment status/claim/assign contracts under `app/AutoService.ApiService/Appointments/**`
  - Profile-picture upload/ETag/cache/SSE behavior under `app/AutoService.ApiService/Profile/**`
  - Aspire resource wiring and ports in `app/AutoService.AppHost/AppHost.cs`
  - Demo seed and role bootstrap behavior in `app/AutoService.ApiService/Data/**`
