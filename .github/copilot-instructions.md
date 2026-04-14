> **Architecture Notice:** This project uses both GitHub Copilot and Claude Code as the primary agentic AI tools. To maintain consistency across the workspace, ensure that any architectural rules or domain constraints updated in this file are also synchronized with the `CLAUDE.md` and `.claude/skills/` files.

# ARSM (AutoService) Copilot Instructions (Project-Specific)

## Goal
This repository hosts the **ARSM** (Appointment and Resource Scheduling Management) full-stack application — a mechanic-facing workshop management tool for auto service businesses.

Prioritize maintainable, domain-safe, incremental changes that align with the existing architecture and folder layout.

## Technology Baseline
- Backend: .NET 10 (C# 15) ASP.NET Core Web API + Entity Framework Core.
- Frontend: React 19 + TypeScript + Vite.
- Styling: Tailwind CSS only.
- Orchestration: .NET Aspire (`AutoService.AppHost` + `AutoService.ServiceDefaults`).
- Database target: PostgreSQL via Aspire orchestration.

## Repository Map
- `AutoServiceApp/AutoService.ApiService`: API, domain model, EF Core context and migrations.
- `AutoServiceApp/AutoService.AppHost`: Aspire orchestration entry point.
- `AutoServiceApp/AutoService.ServiceDefaults`: shared defaults and cross-service settings.
- `AutoServiceApp/AutoService.WebUI`: React client.

## Team Coordination Rule (Merge-Conflict Prevention)
- If someone starts working in a shared or high-churn area, they should post a short note in the team group first (scope + expected files).
- For parallel work, prefer folder-level ownership during a work window (for example, one person on `ApiService/Auth`, another on `WebUI/src`).
- Before pushing larger changes, sync in the group to avoid simultaneous edits on the same files.

## AI SQL Safety Rule (Mandatory)
- For AI-assisted DB checks, use `ai_agent_test_user` only.
- Restrict AI SQL execution to read-only `SELECT` queries.
- Never execute DML/DDL from AI SQL tools (`INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `ALTER`, `CREATE`, `DROP`, `GRANT`, `REVOKE`).

## Documentation Sync Rule (Mandatory)
- After any change that affects API endpoints, EF migrations, middleware pipeline, WebUI pages/components/routes, dependencies (NuGet or npm), AppHost resource wiring, or configuration keys — run `/docs-sync` before considering the task complete.
- This keeps all `CLAUDE.md` files and `.github/instructions/` files in sync with the actual code.
- Trigger sections: endpoints, migrations, middleware order, pages, components, routes, stores, services, dependencies, config keys, AppHost resources, security settings (lockout, rate limits, token lifetimes).

## Endpoint Test Sync Rule (Mandatory)
- After any API endpoint is added/changed/removed, run `/endpoint-tests-sync` before considering the task complete.
- This keeps endpoint-level tests synchronized in:
	- `tests/API/*.http`
	- `tests/Database/*.sql`

## MCP Policy (Workspace)
- Keep MCP server setup intentionally minimal and project-focused.
- Track MCP config via templates: `.vscode/mcp.template.json` and `.claude/.mcp.template.json`.
- Runtime MCP files stay local/ignored: `.vscode/mcp.json` and `.claude/.mcp.json`.
- Keep `.vscode` and `.claude` MCP server sets aligned.
- Current shared server set:
	- `context-mode`
	- `aspire` (workspace-local tool via `dotnet tool run aspire -- mcp start`)
	- `postgres`
	- `docker`
- Local tool manifest for Aspire CLI: `dotnet-tools.json` at repository root.
- Default workflow: treat context-mode as automatic routing/enforcement. Do not require explicit context-mode prompts for routine small tasks.
- Prefer explicit context-mode tool usage when output can be large (long logs, broad searches, large API/CLI output, large docs/web content).
- For multi-step research, prefer batching/indexing patterns (`ctx_batch_execute`, indexing + search) over many separate high-output calls.
- After editing MCP templates or runtime MCP config, restart VS Code to ensure routing instructions are reloaded.

## Specialist Agents (`.github/agents/`, Mandatory Delegation)
This project uses specialist agents for task decomposition and delegation. **All implementation tasks must be delegated to specialist agents via the orchestrator** — never execute inline.

| Agent | Scope | When to use |
|-------|-------|-------------|
| **Task Orchestrator** | Task decomposition | **Always first** — analyzes every task and decides which specialists work on it in which phases |
| **Backend Specialist** | `AutoService.ApiService` | Endpoints, domain model, DTOs, auth, middleware, EF queries |
| **Frontend Specialist** | `AutoService.WebUI` | Components, pages, stores, services, i18n, routing, styling |
| **EF Migration** | EF Core migrations | Creating, validating, and troubleshooting migrations |
| **Documentation Sync** | Documentation files | **Always runs after changes** — syncs CLAUDE.md, .github/instructions, copilot-instructions.md, ARSM-TL-DR.md |
| **Endpoint Test Sync** | .http and .sql test files | After API endpoint add/change/remove |
| **Build Validator** | Build + type-check | Fast post-change validation (backend build + frontend tsc) |

**Agent files:** `.github/agents/*.agent.md` (Copilot) and `.claude/agents/*.md` (Claude Code) — both sets define the same specialist roles.

**Mandatory workflow:**
1. **Orchestrator first** — every task goes through the orchestrator for decomposition and phase planning.
2. **Specialist execution** — identified agents execute in parallel where possible.
3. **Validate** — always runs after code changes.
4. **Docs sync (always)** — must run after every change. If changes touch skills, agents, or instruction files, those are updated too.
5. **Test endpoints** — runs after any API endpoint change.

## Copilot Skill Entry Points
- Use `/mcp-context-policy` for MCP server interaction policy and Context Mode usage decisions.
- Use `/config-driven-endpoints` for URL/port changes to enforce config-driven addressing and avoid hardcoded fallback endpoints.
- Use `/ef-migration` for EF migration execution and troubleshooting.
- Use `/docs-sync` to synchronize all CLAUDE.md and .github/instructions files with the actual codebase state after significant changes.
- Use `/endpoint-tests-sync` to update endpoint HTTP/SQL test suites after endpoint changes.
- Keep README usage references concise; detailed policy/workflow logic belongs in skill files under `.github/skills/*/SKILL.md`.

## Configuration-First Addressing Rule
- Keep local ports and service endpoints in configuration files; do not hardcode runtime fallback URLs.
- For service endpoint changes, update the relevant config sources consistently:
	- `AutoServiceApp/AutoService.AppHost/appsettings.json` (ports)
	- `AutoServiceApp/AutoService.ApiService/Properties/launchSettings.json` (API local URL)
	- `AutoServiceApp/AutoService.WebUI/.env.development` (WebUI local env)
- Keep frontend API base URL environment-driven (`VITE_API_URL`) and avoid code-level localhost fallback.
- When adding new services, define addresses in config first, then wire via Aspire/environment injection.

## Backend Non-Negotiables
- Keep `People` inheritance as TPH (Table-Per-Hierarchy) at all times.
- Keep `People` as abstract base and keep `Customer` + `Mechanic` as derived entities.
- Keep one `people` table with discriminator; do not switch to TPT or TPC.
- Keep authentication based on ASP.NET Core Identity with `IdentityUser`; do not replace the domain `People` model with Identity entities.
- Link the domain model to Identity through `People.IdentityUserId`; do not duplicate password or credential fields on `People`, `Customer`, or `Mechanic`.
- Preserve `FullName` as an owned value object mapping on `People`.
- Preserve mechanic expertise rules:
	- expertise list must contain 1..10 items,
	- items must be unique,
	- persisted expertise must never be empty.
- Preserve core relationships:
	- `Customer` 1..* `Vehicle`,
	- `Vehicle` 1..* `Appointment`,
	- `Appointment` *..* `Mechanic` (join table).
- Do not expose EF entities directly from API boundaries; use DTO contracts.

## EF Core and Data Rules
- The EF Core provider is `Npgsql.EntityFrameworkCore.PostgreSQL`; use `options.UseNpgsql(...)` in `Program.cs`.
- Keep model configuration centralized in `Data/AutoServiceDbContext.cs`.
- Place new migrations in `Data/Migrations`.
- Current migrations: `InitialCreate`, `AddIdentityAndIdentityUserId`, `AddRefreshTokensAndCookieAuth`, `AddProfilePicture`, `AddAppointmentTimestamps`, `BackfillDemoData`, `AddAppointmentIntakeAndDueDateTime`, `AddRevokedJwtTokenDenylist`.
- `DemoDataInitializer.EnsureSeededAsync()` runs on startup: calls `MigrateAsync()` then seeds mechanics (with Identity accounts), customers (plain records), vehicles, and appointments when tables are empty. Seeding includes 30 additional generated appointments in the current UTC month (including today and multiple same-day entries).
- Demo seeding includes legacy-state recovery: if a migrated/backfilled dataset contains customer-side data but lacks mechanics/identity linkage, the initializer resets that inconsistent dataset and reseeds deterministic demo data.
- Outside Development, seeding requires `DemoData:EnableSeeding=true` and `DemoData:MechanicPassword`.
- Startup/seeding must fail fast if `ConnectionStrings:AutoServiceDb`, `JwtSettings:Secret`, or `DemoData:MechanicPassword` still contains template markers (for example `CHANGE_ME` or `SET_UNIQUE_LOCAL`, including punctuation-separated variants).
- Prefer async EF methods for I/O (`SaveChangesAsync`, `ToListAsync`, etc.).
- Keep schema constraints and indexes aligned with domain invariants.
- Use `ConnectionStrings:AutoServiceDb` as the canonical connection key.
- Configuration keys: `ConnectionStrings:AutoServiceDb`, `JwtSettings:Secret` (min 32 bytes), `JwtSettings:Issuer`, `JwtSettings:Audience`, `Cors:AllowedOrigins`, `ForwardedHeaders:ForwardLimit`, `ForwardedHeaders:KnownProxies`, `ForwardedHeaders:KnownNetworks`.
- API appsettings default CORS origin is `https://localhost:5173`.
- Never hardcode credentials in committed source code.
- Prefer Aspire-injected configuration, environment variables, and gitignored local overrides.
- Local standalone run (outside AppHost): provide the PostgreSQL connection string in `appsettings.Local.json` (gitignored) or via the `ConnectionStrings__AutoServiceDb` environment variable.

## API Implementation Rules
- Keep `Program.cs` focused on service registration, middleware, and endpoint mapping.
- Place cross-cutting logic in dedicated files/folders (for example `Auth`, `Contracts`, extensions).
- Keep auth endpoint mapping in dedicated auth files under `AutoService.ApiService/Auth`.
- Prefer splitting oversized auth endpoint implementations into focused files (map/register/login/helpers/contracts) under `AutoService.ApiService/Auth`.
- Configure authentication with ASP.NET Core Identity + JWT Bearer; read the signing secret from `JwtSettings:Secret`.
- Only **mechanics** can register and log in; **customers are passive domain records** (vehicle owners, notification targets) with no login account and no `IdentityUserId`.
- Keep registration logic transactional: create `IdentityUser` and linked `Mechanic` domain record together, linked by `People.IdentityUserId`.
- Login/refresh/logout endpoints should verify credentials/session through Identity + persisted refresh tokens and maintain HttpOnly cookie auth state.
- Auth cookies: access token in `autoservice_at`, refresh token in `autoservice_rt` (both HttpOnly, Secure, SameSite=Strict).
- Keep JWT secrets out of committed config; use `appsettings.Local.json`, environment variables, or user secrets.
- For local auth testing outside AppHost, keep `JwtSettings:Secret` in `appsettings.Local.json` (gitignored) or use the `JwtSettings__Secret` environment variable.
- Use cancellation tokens for async flows where applicable.
- Return accurate HTTP status codes and explicit validation errors.
- Keep comments concise and only for non-obvious logic.

## Current API & Security Snapshot (Keep In Sync With Code)
- Current mapped endpoints in `AutoService.ApiService`:
	- `POST /api/auth/register` (authorized, AdminOnly)
	- `POST /api/auth/login` (rate-limited by policy `AuthLoginAttempts`)
	- `POST /api/auth/refresh` (rate-limited by policy `AuthRefreshAttempts`)
	- `POST /api/auth/logout` (authorized)
	- `GET /api/auth/validate` (authorized)
	- `GET /api/appointments?year=&month=` (authorized) — list appointments for a month
	- `GET /api/appointments/today` (authorized) — list today's appointments
	- `POST /api/appointments/intake` (authorized) — scheduler intake creation with email-based customer lookup/create fallback (including mechanic-email owner-link resolution), due datetime validation, and vehicle numeric max validation on new-vehicle payloads
	- `PUT /api/appointments/{id}` (authorized) — update appointment fields (`scheduledDate`, `dueDateTime`, `taskDescription`); legacy vehicle fields in payload are accepted for backward compatibility and, when provided, are validated (including numeric max constraints) and persisted to the linked vehicle; allowed for assigned mechanics or admins; for past appointments `ScheduledDate` is immutable while `DueDateTime` and `TaskDescription` remain editable
	- `POST /api/customers/{customerId}/appointments` (authorized, AdminOnly) — create an appointment for a customer's vehicle (validation + 201 Created)
	- `PUT /api/appointments/{id}/claim` (authorized) — mechanic claims an appointment only when status is `InProgress` (`422` with code `appointment_cancelled` if Cancelled, or `422` with code `appointment_not_in_progress` for other non-`InProgress` statuses)
	- `DELETE /api/appointments/{id}/claim` (authorized) — mechanic unassigns from an appointment (`422` with code `appointment_cancelled` if Cancelled, `422` with code `appointment_completed` if Completed, or `422` if unassign would leave appointment without mechanics)
	- `PUT /api/appointments/{id}/assign/{mechanicId}` (authorized, AdminOnly) — admin assigns a mechanic (`422` with code `appointment_cancelled` if Cancelled, or `422` with code `appointment_completed` if Completed)
	- `DELETE /api/appointments/{id}/assign/{mechanicId}` (authorized, AdminOnly) — admin removes a mechanic (`422` with code `appointment_cancelled` if Cancelled, `422` with code `appointment_completed` if Completed, or `422` if removal would leave appointment without mechanics)
	- `PUT /api/appointments/{id}/status` (authorized) — update appointment status; auto-sets CompletedAt/CanceledAt timestamps and allows transitioning Cancelled appointments back to InProgress/Completed (including past-dated appointments)
	- `GET /api/profile` (authorized) — get current user profile (name, email, phone, picture status)
	- `PUT /api/profile` (authorized) — update current user profile (email/phone/firstName/middleName/lastName)
	- `DELETE /api/profile` (authorized, non-admin) — delete current user profile after current-password validation (returns 403 for admin users)
	- `POST /api/profile/change-password` (authorized) — change password
	- `GET /api/profile/picture` (authorized) — get profile picture binary
	- `GET /api/profile/picture/{personId}` (authorized) — get mechanic profile picture binary by person id (404 if mechanic/picture missing)
	- `GET /api/profile/picture/updates` (authorized) — SSE stream for realtime profile-picture updates (`profile-picture-updated` events)
	- `PUT /api/profile/picture` (authorized, multipart/form-data) — upload profile picture (server validates image magic bytes and rejects MIME/content mismatches)
	- `DELETE /api/profile/picture` (authorized) — remove profile picture
	- `GET /api/admin/mechanics` (authorized, AdminOnly) — list all mechanics with admin flag and `hasProfilePicture`
	- `DELETE /api/admin/mechanics/{id}` (authorized, AdminOnly) — delete a mechanic (403 for admin targets or self-deletion; 422 if it would leave zero mechanics globally or orphan any appointment without assigned mechanics; 409 on concurrent contention/serialization conflict; 500 if linked identity deletion fails)
	- `GET /api/customers` (authorized) — list all customers
	- `GET /api/customers/by-email` (authorized) — lookup customer by email for scheduler intake (returns customer + vehicles; mechanic email also resolves successfully for own-car intake even when linked customer record is not yet materialized, returning an empty vehicle list)
	- `GET /api/customers/{id}` (authorized) — get customer with vehicle list
	- `POST /api/customers` (authorized, AdminOnly) — create customer record
	- `PUT /api/customers/{id}` (authorized, AdminOnly) — update customer record
	- `DELETE /api/customers/{id}` (authorized, AdminOnly) — delete customer and cascaded vehicles
	- `GET /api/customers/{customerId}/vehicles` (authorized) — list vehicles for a customer
	- `GET /api/vehicles/{id}` (authorized) — get single vehicle with customer summary
	- `POST /api/customers/{customerId}/vehicles` (authorized, AdminOnly) — create vehicle for a customer
	- `PUT /api/vehicles/{id}` (authorized, AdminOnly) — update vehicle record
	- `DELETE /api/vehicles/{id}` (authorized, AdminOnly) — delete vehicle and cascaded appointments
	- `GET /openapi/v1.json` in Development (`app.MapOpenApi()`)
	- Scalar API Reference at `/scalar/v1` in Development (`app.MapScalarApiReference()`)
	- `GET /health` and `GET /alive` in Development (`app.MapDefaultEndpoints()`)
- Appointment endpoints use DTOs (`AppointmentDto` includes `IntakeCreatedAt` and `DueDateTime`, plus `CompletedAt`/`CanceledAt`), `VehicleDto`, `CustomerSummaryDto`, `MechanicSummaryDto`, `UpdateStatusRequest`, `UpdateAppointmentRequest`, and `SchedulerCreateIntakeRequest`, and follow partial-class pattern in `Appointments/` folder.
- Auth and login behavior currently implemented:
	- registration is mechanic-only and admin-only,
	- login accepts email or phone number,
	- email inputs are trimmed and normalized to lowercase,
	- Hungarian phone inputs accept common formats (`+36`, `36`, `06`, local national form without prefix like `301112233`, spaces/punctuation) and normalize to canonical national form with strict prefix/length rules (`361xxxxxxx`, `36(20|21|30|31|50|70)xxxxxxx`, and approved 2-digit geographic area prefixes),
	- register rejects duplicate phone numbers even if input format differs,
	- register pre-checks normalized email collisions against both Identity users and domain `People` records (including passive customers),
	- register maps unique-email database races to controlled validation errors on `Email`,
	- unknown/wrong credentials return generic `401` (`invalid_credentials`),
	- existing customer email/phone identifiers follow the same generic `401` (`invalid_credentials`) path to reduce account enumeration,
	- lockout is enabled (`5` failed attempts, `15` minutes lockout),
	- login rate limit is `10` requests per minute per client IP,
	- refresh rate limit is `20` requests per minute per client IP,
	- temporary login ban window after rate-limit rejection is currently `3` minutes,
	- access token lifetime is currently `10` minutes,
	- refresh token lifetime is currently `7` days,
	- access and refresh tokens are stored in HttpOnly cookies,
	- refresh tokens are persisted hashed and rotated on refresh.
- JWT validation requirements currently enforced:
	- signed tokens only,
	- issuer and audience validation enabled,
	- lifetime validation enabled,
	- clock skew set to `1` minute,
	- secret must be configured, must not contain template markers (for example `CHANGE_ME` or `SET_UNIQUE_LOCAL`), and must be at least `32` bytes,
	- access token may be read from cookie,
	- denylised `jti` values are rejected.
- Security middleware currently active:
	- `UseForwardedHeaders()` before auth throttling,
	- forwarded-header trust allow-list is read from `ForwardedHeaders:KnownProxies` and `ForwardedHeaders:KnownNetworks` (with loopback fallback when both lists are empty),
	- `UseHttpsRedirection()` always,
	- `UseMiddleware<SecurityHeadersMiddleware>()` after HTTPS redirection,
	- security headers middleware appends `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, and API `Content-Security-Policy`; in Development CSP is skipped for `/openapi` and `/scalar` routes,
	- `UseHsts()` outside Development,
	- custom login ban middleware (3-minute IP cooldown, deterministic 30-second cleanup cadence, max 5000 tracked clients),
	- `UseRateLimiter()`, `UseCors("WebUIPolicy")`, `UseAuthentication()`, `UseAuthorization()`.
- Service defaults: `builder.AddServiceDefaults()` is called at startup (registers OpenTelemetry, health checks, service discovery). `app.MapDefaultEndpoints()` maps `/health` and `/alive` in Development.
- Profile-picture SSE broadcaster uses bounded channels (max 200 concurrent subscriptions, per-subscriber buffer size 32, `DropOldest` overflow strategy).
- Seeding and credential safety:
	- `DemoDataInitializer` runs migrations on startup,
	- seed generation adds 30 additional appointments in the current UTC month (including today and multiple same-day entries),
	- demo seeding outside Development requires `DemoData:EnableSeeding=true`,
	- `DemoData:MechanicPassword` is required when seeding is enabled,
	- placeholder marker values (`CHANGE_ME`, `SET_UNIQUE_LOCAL`, including punctuation-separated variants) in DB/JWT/seeding secrets fail fast at startup/seeding.

> Open implementation gaps and backlog items must be tracked only in `docs/Private-Docs/ARSM-TL-DR.md` under the `TO-DO` section.

## API Test Coverage Snapshot
- `tests/API/auth-and-session.http` includes an auth full matrix for:
	- register (email-only, email+phone, duplicates, invalid email/phone, invalid person type/expertise),
	- login (email normalization and phone format matrix),
	- cookie session lifecycle (validate/refresh/logout + unauthorized follow-ups, logout success returning `204`),
	- security manual tests for denylist bypass and rotated refresh replay attempts.
- API HTTP suites use environment-driven admin credentials via `{{$processEnv ARSM_ADMIN_PASSWORD}}` and `example.com` seed-style identifiers for deterministic local runs.

## Aspire Rules
- `AutoService.AppHost` is the default local entry point.
- Wire dependencies using `WithReference(...)` and startup ordering with `WaitFor(...)` when needed.
- Frontend must use `VITE_API_URL` provided by AppHost instead of hardcoded API endpoints.
- WebUI runs over HTTPS (`WithHttpsEndpoint`) with Vite's `vite-plugin-mkcert`.
- AppHost secret parameters: `postgres-password` (PostgreSQL), `jwt-secret` (injected as `JwtSettings__Secret`).
- Keep infrastructure resource names stable and deterministic when adding new resources.

## Frontend Rules
- Use React function components and strict TypeScript.
- Never suggest Next.js or server-side rendering patterns.
- Use Tailwind utility classes for styling; avoid new custom CSS unless necessary.
- Use pastel purple as the primary accent color for new UI work.
- Ensure layouts are responsive on desktop and mobile.
- Keep API access logic in `src/services` and keep components focused on UI/state.
- Scheduler load-error UX must distinguish auth-expired (`401/403`) failures from generic load failures using dedicated i18n toast keys.
- Scheduler mobile calendar must preserve row baseline alignment using fixed day-number/indicator block heights, with taller week rows only when that week contains appointments.
- AppointmentDetailModal import boundaries are stabilized via extracted presentational files (`AppointmentDetailModal.sections.tsx`, `AppointmentDetailModal.footer.tsx`) while preserving existing behavior.
- Vite dev server runs over HTTPS via `vite-plugin-mkcert` (`server.https: true`).
- Key dependencies: `react-router-dom`, `axios`, `zustand`, `i18next`, `react-i18next`, `tailwindcss`, `jwt-decode`, `react-easy-crop`.

## Code Change Policy for Copilot
- Make minimal, task-focused changes; avoid broad refactors unless requested.
- Preserve existing behavior unless the task explicitly asks for behavior changes.
- For backend changes, validate with `dotnet build` from `AutoServiceApp`.
- For frontend changes, validate with `npm run build` from `AutoService.WebUI` when relevant.
- If task requirements conflict with current implementation, follow this file and call out the conflict clearly.

## Preferred Commands
From `AutoServiceApp` root:
- `dotnet build`
- `dotnet run --project AutoService.AppHost`
- `dotnet ef migrations add <Name> --project AutoService.ApiService --startup-project AutoService.ApiService --output-dir Data/Migrations`
- `dotnet ef database update --project AutoService.ApiService --startup-project AutoService.ApiService`

From `AutoServiceApp/AutoService.WebUI`:
- `npm install`
- `npm run dev`
- `npm run build`