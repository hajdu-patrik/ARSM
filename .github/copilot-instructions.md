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
- `app/AutoService.ApiService`: API, domain model, EF Core context and migrations.
- `app/AutoService.AppHost`: Aspire orchestration entry point.
- `app/AutoService.ServiceDefaults`: shared defaults and cross-service settings.
- `app/AutoService.WebUI`: React client.

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

## Code Documentation Style Rule (Mandatory)
- When adding or changing non-trivial classes/methods, use JSDoc-style block comments.
- Do not use XML documentation comments (`/// <summary>`, `/// <param>`, `/// <returns>`).
- Use the `coding-principles` agent after code changes that introduce/modify classes or methods.

## Endpoint & Database Test Sync Rule (Mandatory)
- After any API endpoint is added/changed/removed, run the `http-endpoint-test` agent for `.http` suites in `tests/API/`.
- After schema or persistence model changes, run the `sql-database-test` agent for `.sql` suites in `tests/Database/`.
- These two agents run independently and can execute in parallel.

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
| **Docs Sync** | Documentation files | **Always runs after changes** — syncs CLAUDE.md, .github/instructions, copilot-instructions.md, ARSM-TL-DR.md |
| **Coding Principles** | Code style & quality enforcement | Enforces JSDoc comments, naming conventions, and structural quality across changed files |
| **HTTP Endpoint Test** | .http test files | After API endpoint add/change/remove |
| **SQL Database Test** | .sql validation files | After schema or persistence model changes |
| **E2E Playwright** | Playwright E2E tests | After frontend UI changes or backend DTO changes that affect the UI |
| **Build Validator** | Build + type-check | Fast post-change validation (backend build + frontend tsc) |

**Agent files:** `.github/agents/*.agent.md` (Copilot) and `.claude/agents/*.md` (Claude Code) — both sets define the same specialist roles.

**Mandatory workflow:**
1. **Orchestrator first** — every task goes through the orchestrator for decomposition and phase planning.
2. **Specialist execution** — identified agents execute in parallel where possible.
3. **Validate** — always runs after code changes.
4. **Docs sync (always)** — must run after every change. If changes touch skills, agents, or instruction files, those are updated too.
5. **Coding principles** — runs after class/method additions/changes to enforce code style and quality.
6. **HTTP endpoint test** — runs after any API endpoint change.
7. **SQL database test** — runs after schema or persistence model changes.
8. **E2E Playwright** — runs after frontend UI or backend DTO changes that affect Playwright tests.

## Agent-First Workflow
Use specialist agents instead of invoking skills directly. Skills serve as runbooks consumed by agents.

| Agent | Skill runbook | Purpose |
|-------|---------------|---------|
| `docs-sync` | `autoservice-docs-sync` | Sync all documentation files with code state |
| `coding-principles` | `autoservice-coding-principles` | Enforce code style, JSDoc comments, naming |
| `http-endpoint-test` | `autoservice-http-endpoint-test` | Update .http test suites after endpoint changes |
| `sql-database-test` | `autoservice-sql-database-test` | Update .sql validation suites after schema changes |
| `migration` | `autoservice-ef-migration` | EF Core migration workflow and troubleshooting |
| `e2e-playwright` | `autoservice-e2e-playwright` | Update Playwright E2E tests after UI/DTO changes |

Agent files: `.github/agents/*.agent.md` — skill runbooks: `.github/skills/*/SKILL.md`.

## Configuration-First Addressing Rule
- Keep local ports and service endpoints in configuration files; do not hardcode runtime fallback URLs.
- For service endpoint changes, update the relevant config sources consistently:
	- `app/AutoService.AppHost/appsettings.json` (ports)
	- `app/AutoService.ApiService/Properties/launchSettings.json` (API local URL)
	- `app/AutoService.WebUI/.env.development` (WebUI local env)
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
- Current migrations: `InitialCreate`, `AddIdentityAndIdentityUserId`, `AddRefreshTokensAndCookieAuth`, `AddProfilePicture`, `AddAppointmentTimestamps`, `BackfillDemoData`, `AddAppointmentIntakeAndDueDateTime`, `AddRevokedJwtTokenDenylist`, `NormalizePhoneNumbersToE164`, `PostSecurityPayloadHardening`.
- `DemoDataInitializer.EnsureSeededAsync()` runs on startup: calls `MigrateAsync()` then seeds mechanics (with Identity accounts), customers (plain records), vehicles, and appointments when tables are empty. Seeding includes 30 additional generated appointments in the current UTC month (including today and multiple same-day entries).
- Demo seeding includes legacy-state recovery: if a migrated/backfilled dataset contains customer-side data but lacks mechanics/identity linkage, the initializer resets that inconsistent dataset using explicit EF set-based deletes (`ExecuteDeleteAsync`, no raw `TRUNCATE`) and reseeds deterministic demo data.
- Outside Development, seeding requires `DemoData:EnableSeeding=true` and `DemoData:MechanicPassword`.
- Startup/seeding must fail fast if `ConnectionStrings:AutoServiceDb`, `JwtSettings:Secret`, or `DemoData:MechanicPassword` still contains template markers (for example `CHANGE_ME` or `SET_UNIQUE_LOCAL`, including punctuation-separated variants).
- Prefer async EF methods for I/O (`SaveChangesAsync`, `ToListAsync`, etc.).
- Keep schema constraints and indexes aligned with domain invariants.
- Use `ConnectionStrings:AutoServiceDb` as the canonical connection key.
- Configuration keys: `ConnectionStrings:AutoServiceDb`, `JwtSettings:Secret` (min 32 bytes), `JwtSettings:Issuer`, `JwtSettings:Audience`, `Cors:AllowedOrigins`, `ForwardedHeaders:ForwardLimit`, `ForwardedHeaders:KnownProxies`, `ForwardedHeaders:KnownNetworks`.
- API appsettings default CORS origin is `https://localhost:5173`. CORS policy restricts methods to `GET/POST/PUT/DELETE` and headers to `Content-Type`.
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
	- `POST /api/auth/register` (authorized, AdminOnly) — returns `RegisterResponse(PersonId, PersonType, Email)`; `IdentityUserId` is not included in the response
	- `POST /api/auth/login` (rate-limited by policy `AuthLoginAttempts`) — returns `LoginResponse(PersonId, IsAdmin)`
	- `POST /api/auth/refresh` (rate-limited by policy `AuthRefreshAttempts`) — returns `204 No Content` with no response body
	- `POST /api/auth/logout` (authorized)
	- `GET /api/auth/validate` (authorized) — returns `ValidateTokenResponse(PersonId, IsAdmin)`
	- `GET /api/appointments?year=&month=` (authorized) — list appointments for a month
	- `GET /api/appointments/today` (authorized) — list today's appointments
	- `POST /api/appointments/intake` (authorized) — scheduler intake creation with email-based customer lookup/create fallback (including mechanic-email owner-link resolution), due datetime validation, and vehicle numeric max validation on new-vehicle payloads
	- `PUT /api/appointments/{id}` (authorized) — update appointment fields (`dueDateTime`, `taskDescription`); `scheduledDate` is always immutable; allowed for assigned mechanics or admins
	- `PUT /api/appointments/{id}/vehicle` (authorized) — update linked vehicle fields (`licensePlate`, `brand`, `model`, `year`, `mileageKm`, `enginePowerHp`, `engineTorqueNm`); allowed for assigned mechanics or admins
	- `POST /api/customers/{customerId}/appointments` (authorized, AdminOnly) — create an appointment for a customer's vehicle (validation + 201 Created)
	- `PUT /api/appointments/{id}/claim` (authorized) — mechanic claims an appointment only when status is `InProgress` (`422` with code `appointment_cancelled` if Cancelled, or `422` with code `appointment_not_in_progress` for other non-`InProgress` statuses)
	- `DELETE /api/appointments/{id}/claim` (authorized) — mechanic unassigns from an appointment (`422` with code `appointment_cancelled` if Cancelled, `422` with code `appointment_completed` if Completed, or `422` if unassign would leave appointment without mechanics)
	- `PUT /api/appointments/{id}/assign/{mechanicId}` (authorized, AdminOnly) — admin assigns a mechanic (`422` with code `appointment_cancelled` if Cancelled, or `422` with code `appointment_completed` if Completed)
	- `DELETE /api/appointments/{id}/assign/{mechanicId}` (authorized, AdminOnly) — admin removes a mechanic (`422` with code `appointment_cancelled` if Cancelled, `422` with code `appointment_completed` if Completed, or `422` if removal would leave appointment without mechanics)
	- `PUT /api/appointments/{id}/status` (authorized) — update appointment status; auto-sets CompletedAt/CanceledAt timestamps and allows transitioning Cancelled appointments back to InProgress/Completed (including past-dated appointments)
	- `GET /api/profile` (authorized) — get current user profile (name, email, phone, picture status)
	- `PUT /api/profile` (authorized) — update current user profile (email/phone/firstName/middleName/lastName)
	- `DELETE /api/profile` (authorized, non-admin) — delete current user profile after current-password validation (returns 403 for admin users); `tokenDenylistService.RevokeAsync()` is called before `transaction.CommitAsync()` to ensure the JWT is denylisted atomically with the deletion
	- `POST /api/profile/change-password` (authorized) — change password
	- `GET /api/profile/picture` (authorized) — get profile picture binary (supports `ETag` + `Cache-Control: public, max-age=3600`; returns `304 Not Modified` when `If-None-Match` matches)
	- `GET /api/profile/picture/{personId}` (authorized) — get mechanic profile picture binary by person id (403 unless caller is admin or requesting own personId; 404 if mechanic/picture missing; supports `ETag` + `Cache-Control: public, max-age=3600`; returns `304 Not Modified` when `If-None-Match` matches)
	- `GET /api/profile/picture/updates` (authorized) — SSE stream for realtime profile-picture updates (`profile-picture-updated` events)
	- `PUT /api/profile/picture` (authorized, multipart/form-data) — upload profile picture (server validates image magic bytes and rejects MIME/content mismatches)
	- `DELETE /api/profile/picture` (authorized) — remove profile picture
	- `GET /api/admin/mechanics` (authorized, AdminOnly) — list all mechanics with admin flag and `hasProfilePicture`; uses a Select projection so `ProfilePicture` blobs are never materialized in memory
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
	- Endpoint mapper registrations declare explicit OpenAPI response metadata (`Produces`, `ProducesProblem`, `ProducesValidationProblem`) so status/body documentation in OpenAPI/Scalar stays accurate without changing runtime behavior
	- `GET /health` and `GET /alive` in Development (`app.MapDefaultEndpoints()`)
- Appointment endpoints use DTOs (`AppointmentDto` includes `IntakeCreatedAt` and `DueDateTime`, plus `CompletedAt`/`CanceledAt`), `VehicleDto`, `CustomerSummaryDto`, `MechanicSummaryDto` (Id, FullName, Specialization, HasProfilePicture; expertise field removed), `UpdateStatusRequest`, `UpdateAppointmentRequest`, `UpdateAppointmentVehicleRequest`, and `SchedulerCreateIntakeRequest`, and follow partial-class pattern in `Appointments/` folder.
- Auth and login behavior currently implemented:
	- registration is mechanic-only and admin-only,
	- login accepts email or phone number,
	- email inputs are trimmed and normalized to lowercase,
	- phone inputs are normalized to canonical E.164 format (`+{countryCode}{nationalNumber}`), validated via libphonenumber, and restricted to the backend's accepted European country-code allowlist,
	- register rejects duplicate phone numbers even if input format differs,
	- register pre-checks normalized email collisions against both Identity users and domain `People` records (including passive customers),
	- register maps unique-email database races to the same generic validation response used by duplicate pre-checks (for example `register`),
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
	- clock skew set to `30` seconds,
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
	- `UseRateLimiter()`, `UseCors("WebUIPolicy")`, `UseMiddleware<AuditAccessDeniedMiddleware>()`, `UseAuthentication()`, `UseAuthorization()`.
- Service defaults: `builder.AddServiceDefaults()` is called at startup (registers OpenTelemetry, health checks, service discovery). `app.MapDefaultEndpoints()` maps `/health` and `/alive` in Development.
- `ExpiredTokenCleanupService` (`Security/ExpiredTokenCleanupService.cs`) is a `BackgroundService` registered via `AddHostedService<ExpiredTokenCleanupService>()`. It runs on a 1-hour interval and removes expired `revokedjwttokens` rows and expired+revoked `refreshtokens` rows.
- `TokenDenylistService.IsRevokedAsync` calls `cancellationToken.ThrowIfCancellationRequested()` at entry; `OperationCanceledException` propagates to the caller. The JWT bearer `OnTokenValidated` event catches it only when `RequestAborted` is set — a cancelled request cannot silently bypass denylist enforcement.
- `TemplateMarkerDetector` (`Configuration/TemplateMarkerDetector.cs`) is a shared static helper for detecting placeholder markers in secrets; used by `JwtSettingsResolver` and `DemoDataInitializer`.
- Shared TTL constants (`AccessTokenTtl`, `RefreshTokenTtl`) and `BuildAuthCookieOptions(TimeSpan ttl)` factory are declared in `AuthEndpoints.Helpers.cs` and reused by login, refresh, and logout flows.
- Profile-picture SSE broadcaster uses bounded channels (max 200 concurrent subscriptions globally, max 5 subscriptions per user, per-subscriber buffer size 32, `DropOldest` overflow strategy).
- Auth and access-denied logs store `ClientIp` as a truncated SHA-256 hash (`sha256:<12hex>`), not as raw IP.
- Outside Development, startup fails fast when `AllowedHosts` is missing/empty or contains wildcard (`*`) or `localhost`.
- Seeding and credential safety:
	- `DemoDataInitializer` runs migrations on startup,
	- seed generation adds 30 additional appointments in the current UTC month (including today and multiple same-day entries),
	- legacy backfill reset uses explicit EF set-based deletes (`ExecuteDeleteAsync`), not raw `TRUNCATE`,
	- demo seeding outside Development requires `DemoData:EnableSeeding=true`,
	- `DemoData:MechanicPassword` is required when seeding is enabled,
	- placeholder marker values (`CHANGE_ME`, `SET_UNIQUE_LOCAL`, including punctuation-separated variants) in DB/JWT/seeding secrets fail fast at startup/seeding.

> Open implementation gaps and backlog items must be tracked only in `docs/Private-Docs/ARSM-TL-DR.md` under the `TO-DO` section.

## API Test Coverage Snapshot
- `tests/API/**/*.http` (chunked suites under `auth/`, `appointments/`, `customers/`, `profile/`, `admin/`, `vehicles/`) includes:
	- register (email-only, email+phone, duplicates, invalid email/phone, invalid person type/expertise) with duplicate/domain-conflict expectations aligned to generic `register` validation responses,
	- login (email normalization and phone format matrix),
	- cookie session lifecycle (validate/refresh/logout + unauthorized follow-ups, logout success returning `204`),
	- security manual tests for denylist bypass and rotated refresh replay attempts.
- `tests/API/appointments/*.http` (10 files) includes scheduler/admin appointment flows for:
	- scheduler intake with existing/new customer and vehicle paths, mechanic-email linked-customer flow, duplicate new-vehicle license-plate conflict (`409`), vehicleId not found (`404`), and vehicle numeric max validation (`422`),
	- split appointment update coverage: `PUT /api/appointments/{id}` for due/task updates and `PUT /api/appointments/{id}/vehicle` for vehicle-field updates/validation,
	- appointment update immutability guard (`scheduledDate` change rejected with `422`) while due/task updates remain allowed,
	- mechanic claim/unclaim guardrails: claim on cancelled/non-InProgress (`422`), duplicate claim (`409`), unclaim on cancelled/completed (`422`), unclaim when not assigned (`409`), unclaim when last mechanic (`422`), and 404 for non-existent appointments,
	- status transitions: InProgress/Completed/Cancelled/reopen-from-cancelled, invalid status (`400`), non-assigned mechanic forbidden (`403`),
	- admin assign/unassign guardrails: cancelled/completed (`422`), already assigned/not assigned (`409`), mechanic or appointment not found (`404`), last mechanic removal (`422`),
	- unauthenticated matrix includes `PUT /api/appointments/{id}/vehicle` returning `401`.
- `tests/API/profile/*.http` (4 files) includes:
	- profile get and positive update flows (name, email, phone fields),
	- profile picture cache semantics: `ETag` + `Cache-Control` header expectations and conditional `If-None-Match` requests for `304 Not Modified`,
	- duplicate email/phone conflict (`409`/`422`), invalid format (`422`), empty name fields (`422`),
	- name field character validation (space/digit/apostrophe rejection, `422`),
	- change-password flows: wrong current password, too-short new password, confirmation mismatch (all `400`), positive change,
	- account delete: wrong password (`400`), missing password body (`400`), admin self-delete forbidden (`403`), non-admin self-delete (`204`).
- `tests/Database/**/*.sql` (chunked suites under `core-schema/`, `identity-auth/`, `feature-flow/`) covers schema baseline, identity/auth data checks, and feature-flow regression guards.
- API HTTP suites use environment-driven admin credentials via `{{$processEnv ARSM_TEST_ADMIN_PASSWORD}}` and `example.test` synthetic identifiers for deterministic local runs.

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
- Scheduler claim CTAs are rendered as full-width buttons in both appointment cards and detail footer when visible.
- Claim button is hidden for overdue appointments; mechanic mutation controls are locked when the appointment is `Cancelled` or `Completed`.
- Scheduler self-unassign control is hidden when the current mechanic is the sole assigned mechanic.
- Scheduler intake form sections keep grouped user/vehicle/task titles with unified field styles and explicit placeholders (including vehicle detail inputs), and existing-vehicle select keeps a disabled non-selectable placeholder option.
- Scheduler intake lookup-dependent UI state resets when the lookup email changes or when lookup fails (clears stale vehicle/task sections before showing errors).
- Vite dev server runs over HTTPS via `vite-plugin-mkcert` (`server.https: true`).
- WebUI E2E testing uses Playwright (`@playwright/test`) with config in `app/AutoService.WebUI/playwright.config.ts` and specs under `app/AutoService.WebUI/tests/e2e`.
- Key dependencies: `react-router-dom`, `axios`, `zustand`, `i18next`, `react-i18next`, `tailwindcss`, `react-easy-crop`, `@playwright/test`.

## Code Change Policy for Copilot
- Make minimal, task-focused changes; avoid broad refactors unless requested.
- Preserve existing behavior unless the task explicitly asks for behavior changes.
- For backend changes, validate with `dotnet build` from `app`.
- For frontend changes, validate with `npm run build` from `AutoService.WebUI` when relevant.
- If task requirements conflict with current implementation, follow this file and call out the conflict clearly.

## Preferred Commands
From `app` root:
- `dotnet build`
- `dotnet run --project AutoService.AppHost`
- `dotnet ef migrations add <Name> --project AutoService.ApiService --startup-project AutoService.ApiService --output-dir Data/Migrations`
- `dotnet ef database update --project AutoService.ApiService --startup-project AutoService.ApiService`

From `app/AutoService.WebUI`:
- `npm install`
- `npm run dev`
- `npm run build`
- `npm run e2e`
- `npm run e2e:headed`
- `npm run e2e:ui`