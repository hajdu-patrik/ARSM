> **Architecture Notice:** This project uses both GitHub Copilot and Claude Code as the primary agentic AI tools. To maintain consistency across the workspace, ensure that any architectural rules or domain constraints updated in this file are also synchronized with the `CLAUDE.md` and `.claude/skills/` files.

# AutoService Copilot Instructions (Project-Specific)

## Goal
This repository hosts the AutoService full-stack application.

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

## MCP and Hook Policy (Workspace)
- Keep MCP server setup intentionally minimal and project-focused.
- Primary servers for this repository:
	- `pencil-design-tool`
	- `context-mode`
- Optional server when Aspire workflow support is needed:
	- `aspire` (use workspace-local tool via `dotnet tool run aspire -- mcp start`)
- Do **not** add extra MCP servers unless they clearly reduce repeated manual work for this project.
- MCP server workspace config file: `.vscode/mcp.json`.
- Hook config file for context-mode lifecycle integration: `.github/hooks/context-mode.json`.
- Default workflow: treat context-mode as automatic routing/enforcement. Do not require explicit context-mode prompts for routine small tasks.
- Prefer explicit context-mode tool usage when output can be large (long logs, broad searches, large API/CLI output, large docs/web content).
- For multi-step research, prefer batching/indexing patterns (`ctx_batch_execute`, indexing + search) over many separate high-output calls.
- After editing MCP/hook config, restart VS Code to ensure hooks and routing instructions are reloaded.

## Copilot Skill Entry Points
- Use `/mcp-context-policy` for MCP server interaction policy and Context Mode usage decisions.
- Use `/config-driven-endpoints` for URL/port changes to enforce config-driven addressing and avoid hardcoded fallback endpoints.
- Use `/ef-migration` for EF migration execution and troubleshooting.
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
- Current migrations: `InitialCreate` + `AddIdentityAndIdentityUserId`.
- `DemoDataInitializer.EnsureSeededAsync()` runs on startup: calls `MigrateAsync()` then seeds mechanics (with Identity accounts) and customers (plain records) when tables are empty.
- Prefer async EF methods for I/O (`SaveChangesAsync`, `ToListAsync`, etc.).
- Keep schema constraints and indexes aligned with domain invariants.
- Use `ConnectionStrings:AutoServiceDb` as the canonical connection key.
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
- Login endpoints should verify credentials through Identity and issue JWTs that include domain linkage claims such as person id and person type.
- Keep JWT secrets out of committed config; use `appsettings.Local.json`, environment variables, or user secrets.
- For local auth testing outside AppHost, keep `JwtSettings:Secret` in `appsettings.Local.json` (gitignored) or use the `JwtSettings__Secret` environment variable.
- Use cancellation tokens for async flows where applicable.
- Return accurate HTTP status codes and explicit validation errors.
- Keep comments concise and only for non-obvious logic.

## Current API & Security Snapshot (Keep In Sync With Code)
- Current mapped endpoints in `AutoService.ApiService`:
	- `POST /api/auth/register`
	- `POST /api/auth/login` (rate-limited by policy `AuthLoginAttempts`)
	- `GET /openapi/v1.json` in Development (`app.MapOpenApi()`)
- No `Customer`, `Vehicle`, or `Appointment` CRUD endpoints are currently mapped.
- Auth and login behavior currently implemented:
	- registration is mechanic-only,
	- login accepts email or phone number,
	- unknown email/phone returns `404` with `identifier_not_found`,
	- wrong password returns `401` with `password_incorrect`,
	- lockout is enabled (`5` failed attempts, `15` minutes lockout),
	- login rate limit is `10` requests per minute per client IP,
	- temporary login ban window after rate-limit rejection is currently `3` minutes,
	- login JWT lifetime is currently `10` minutes.
- JWT validation requirements currently enforced:
	- signed tokens only,
	- issuer and audience validation enabled,
	- lifetime validation enabled,
	- clock skew set to `1` minute,
	- secret must be configured and at least `32` bytes.
- Security middleware currently active:
	- `UseHttpsRedirection()` always,
	- `UseHsts()` outside Development,
	- `UseRateLimiter()`, `UseAuthentication()`, `UseAuthorization()`.
- Seeding and credential safety:
	- `DemoDataInitializer` runs migrations on startup,
	- demo seeding outside Development requires `DemoData:EnableSeeding=true`,
	- `DemoData:MechanicPassword` is required when seeding is enabled.

## Current Known Gaps (As Of Current Code)
- `AutoService.ApiService/Contracts` remains minimal and should be expanded as endpoint surface grows.
- `Customer`, `Vehicle`, and `Appointment` CRUD endpoints are still not mapped.
- Frontend currently covers login/dashboard/404 flows only; no domain CRUD UI yet.
- CORS policy is currently permissive (`AllowAnyOrigin`) and should be tightened for production.
- `AutoService.ServiceDefaults` health endpoint extensions exist, but API does not currently call `MapDefaultEndpoints()`.
- No dedicated unit/integration test project exists yet.

## Aspire Rules
- `AutoService.AppHost` is the default local entry point.
- Wire dependencies using `WithReference(...)` and startup ordering with `WaitFor(...)` when needed.
- Frontend must use `VITE_API_URL` provided by AppHost instead of hardcoded API endpoints.
- Keep infrastructure resource names stable and deterministic when adding new resources.

## Frontend Rules
- Use React function components and strict TypeScript.
- Never suggest Next.js or server-side rendering patterns.
- Use Tailwind utility classes for styling; avoid new custom CSS unless necessary.
- Use pastel purple as the primary accent color for new UI work.
- Ensure layouts are responsive on desktop and mobile.
- Keep API access logic in `src/services` and keep components focused on UI/state.

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