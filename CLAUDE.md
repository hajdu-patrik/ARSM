# CLAUDE Guidelines

> Architecture Notice: ARSM uses Claude Code + GitHub Copilot. Keep `.claude/**` and `.github/**` policy-equivalent.

## Model Selection Policy (Auto Mode)

- In auto/agent mode, never automatically select a model that costs more than 3x the baseline tier.
- Forbidden for automatic selection (only allowed when the user explicitly starts the session with that model): `claude-opus-4.7` at any level.
- Preferred auto-selection pool: `claude-sonnet 4.6` (high), `claude-haiku` (latest stable), or equivalent Claude-tier models.
- If a task genuinely requires `claude-opus-4.7`, surface the suggestion to the user and wait for explicit approval before switching.

## Team Identity (Global)

- Elite startup: MIT/Harvard/Stanford founding team; enterprise-scale quality bar.
- Patrik (CEO, Chief Architect, MIT, ex-Google): architecture authority, final quality gate.
- Mark (Backend Lead, MIT, ex-BlackRock/Morgan Stanley): backend/data/scale authority.
- Gergely (Frontend Lead, Harvard, ex-Netflix/Meta): UI/UX/responsive authority.
- Zsombor (DevAIMLSecOps+QA, Stanford, ex-Amazon/Oracle): CI/CD, testing, security authority.

## Persona Routing

- Architecture/final approval: Patrik.
- Backend/API/data: Mark.
- Frontend/UI/UX: Gergely.
- Testing/security/validation: Zsombor.

## Repository Map

- `app/AutoService.ApiService`: API/domain/EF.
- `app/AutoService.WebUI`: React client.
- `app/AutoService.AppHost`: Aspire orchestration.
- `app/AutoService.ServiceDefaults`: shared service defaults.

## Stack

- Backend: .NET 10, ASP.NET Core API, EF Core, PostgreSQL.
- Frontend: React 19, TypeScript, Vite, Tailwind.
- Orchestration: .NET Aspire.

## Mandatory Agent Workflow

1. Orchestrator first (`orchestrator`).
2. Conditional implementation routing from orchestrator: backend/platform changes required (`AutoService.ApiService`, `AutoService.AppHost`, `AutoService.ServiceDefaults`, or source-level backend changes) -> run `backend`; frontend changes required -> run `frontend` AND `ui-ux-style-profile` as a **mandatory pair** (never one without the other); `ui-ux-style-profile` must execute the 320px Mandatory Validation Checklist and produce a written per-component report after every `frontend` iteration — iteration is blocked until sign-off; EF/schema delta only -> optional `migration`.
3. Validate (`validate`) must always run after implementation.
4. Docs sync always (`docs-sync`) with automatic documentation remediation.
5. Coding principles always (`coding-principles`) with automatic source remediation.
6. Security remediation on every code-change workflow:
   - Frontend touched: `npm audit fix`.
   - Backend/.NET project touched: `dotnet list package --vulnerable --include-transitive` then patch/minor upgrades and recheck.
7. Heavy test agents (`http-endpoint-test`, `sql-database-test`, `e2e-playwright-test`) are conditional (see gate).

## Execution Mode (Speed Policy)

- Prefer local workspace execution (`run_in_terminal`, VS Code tasks, native CLI) as the default for build/test/validation workflows.
- Avoid MCP server tooling when a local command/task provides equivalent or near-equivalent speed and outcome.
- Use MCP tooling only when no practical local alternative exists, or when the needed capability is MCP-only.
- Keep this rule aligned with `.github/copilot-instructions.md`.

## Canonical Local Test Runner

- Use `python scripts/run-local-test-suite.py [all|playwright|http|sql]` from the repository root for local full-suite or selected-suite execution.
- The runner loads `.secrets` and `tests/.env` locally, sets non-secret `PORT=5173` for Playwright when absent, and writes the sanitized AI-readable report to `tests/.artifacts/test-suite-summary.json`.
- Full-test AI workflow: run the Python runner, inspect the sanitized report, then add missing tests, fix stale tests, or investigate product behavior from the reported suite layer.
- Do not publish raw `.env`, `.secrets`, local MCP config, connection strings, cookies, tokens, absolute local paths, or unsanitized command output.

## Heavy Test Gate (Cost Control)

Run heavy test agents only when the user explicitly requests tests, or when the agent-specific trigger applies:

- `http-endpoint-test`: significant API endpoint, contract, auth/role, status, or validation behavior change.
- `sql-database-test`: significant schema, migration, persistence, seed-data, or integrity invariant change.
- `e2e-playwright-test`: significant frontend structural/UI flow or user-visible journey change; backend-only changes do not trigger Playwright unless explicitly requested.

If heavy test agent is triggered by a new feature:

- generate missing coverage first,
- then execute/update the suite.

## Migration Gate (Isolation)

Run `migration` only if schema delta exists:

- entity model/DbContext relationship/column/index constraints changed, or
- EF migration files changed/required.

Otherwise: skip migration agent.

## Engineering Principles (Mandatory)

- Apply SOLID principles systematically (SRP, OCP, LSP, ISP, DIP).
- Use OOP intentionally: cohesive classes, explicit responsibilities, low coupling, high cohesion.
- Use GoF 23 patterns pragmatically (for example Strategy, Factory, Adapter, Observer) where they reduce complexity and improve extensibility.
- Do not force patterns without clear value; avoid pattern cargo-culting.
- For non-trivial design decisions, include engineering rationale: why this approach, why alternatives were rejected, and how scalability/maintainability is improved.

## Scalability & Maintainability Guardrails

- No god files, no god classes, no god methods.
- Source file targets: preferred <= 350 lines; hard limit: > 500 lines must be split.
- Test file targets: preferred <= 180 lines; hard limit: > 250 lines must be split.
- Class/service targets: preferred <= 220 lines; hard limit: > 300 lines must be split by responsibility.
- Method/function target: <= 60 lines where practical; split long methods into focused helpers.

## Credentials & Secrets Policy (Mandatory)

- Never hardcode credentials, passwords, connection strings, hosts, or tokens in source/tests/scripts/agent output.
- Secret sources (gitignored): `.secrets` (repo root) for E2E/Playwright runtime env loaded by `python scripts/run-local-test-suite.py playwright`, and `tests/.env` for HTTP `.http` tests via `{{$processEnv VAR_NAME}}`.
- Template: `tests/.env.example` (placeholder values only).
- Key vars: `ARSM_TEST_MECHANIC_EMAIL`, `ARSM_TEST_MECHANIC_PASSWORD`, `ARSM_TEST_ADMIN_EMAIL`, `ARSM_TEST_ADMIN_PASSWORD`, `ARSM_TEST_CUSTOMER_EMAIL`, `ARSM_TEST_PASSWORD`, `ARSM_TEST_WRONG_PASSWORD`, `ARSM_TEST_MECHANIC_NEW_PASSWORD`, `AutoService_ApiService_HostAddress`, optional `ARSM_E2E_*` aliases.
- Agent rules: HTTP/SQL tests use env vars only (`{{$processEnv ...}}`), never literal credentials; E2E tests use credentials only from `app/AutoService.WebUI/tests/e2e/support/e2e-env.ts` (`getAppointmentFlowEnv`, `getAdminFlowEnv`) when the WebUI E2E suite is present; EF migrations/seed scripts must not embed connection strings and must use `appsettings.Local.json` (gitignored) or env injection; prefer the canonical Python runner over shell-specific Playwright/HTTP/SQL commands when executing local suites; if a variable is missing, report exact name and point to `tests/.env.example` or `.secrets`.

## Non-Negotiables

- Configuration-first addressing: no hardcoded runtime fallback URLs/ports.
- WebUI UI/UX policy source of truth: `.claude/agents/ui-ux-style-profile.md` (Claude) / `.github/agents/ui-ux-style-profile.agent.md` (Copilot); both files must remain policy-equivalent.
- WebUI clean-design rule: no shadows (`shadow-*`, `dark:shadow-*`, CSS `box-shadow`, `transition-shadow`) across UI elements.
- Backend invariants: `People` remains abstract TPH; Identity linkage via `People.IdentityUserId`; expertise and relationship invariants preserved.
- API boundaries use DTOs only; no direct EF entity exposure.
- SQL safety for AI tooling: `ai_agent_test_user`, read-only `SELECT`, no DML/DDL.

## Platform Alignment Rule

- Claude + Copilot agents/skills must be semantically equivalent.
- Differences allowed only for platform syntax/frontmatter/tool declarations.

## Area-Specific Rule Files

- Backend: `app/AutoService.ApiService/CLAUDE.md`
- Frontend: `app/AutoService.WebUI/CLAUDE.md`
- AppHost: `app/AutoService.AppHost/CLAUDE.md`
- ServiceDefaults: `app/AutoService.ServiceDefaults/CLAUDE.md`
- Tests: `tests/CLAUDE.md`

## Operational Anchors (Consolidated)

- Keep operational knowledge distributed across instruction/agent/skill layers; do not rely on a single long-form TL-DR document as primary runtime truth.
- Canonical local runtime surface: Aspire dashboard `https://localhost:17094`, API `https://localhost:5200`, WebUI `https://localhost:5173`, PostgreSQL `localhost:50000`.
- Session/auth contract anchors: access cookie `autoservice_at` (10 minutes), refresh cookie `autoservice_rt` (7 days), login rate limit `10/min per IP`, refresh rate limit `20/min per IP`, lockout 5 failed password attempts -> 15 minutes.
- Runtime behavior anchors that must stay docs-synced when changed: middleware/denylist in `app/AutoService.ApiService/Program.cs`, auth/session under `app/AutoService.ApiService/Auth/**`, appointment status/claim/assign under `app/AutoService.ApiService/Appointments/**`, vehicle/customer/scheduler contracts under `app/AutoService.ApiService/Vehicles/**`, `app/AutoService.ApiService/Customers/**`, and scheduler intake code, profile-picture behavior under `app/AutoService.ApiService/Profile/**`, AppHost wiring in `app/AutoService.AppHost/AppHost.cs`, and seed/bootstrap behavior under `app/AutoService.ApiService/Data/**`.
- Test runner anchor: `scripts/run-local-test-suite.py` is the canonical local all-suite runner and sanitized AI test-report producer.
