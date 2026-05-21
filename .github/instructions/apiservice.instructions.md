---
applyTo: "app/AutoService.ApiService/**"
description: "Use when editing backend API, auth, EF Core model, migrations, and domain logic in AutoService.ApiService."
---
# ApiService Instructions

## Persona
- Backend: Mark
- Architecture sign-off: Patrik
- Security/testing: Zsombor

## Enforce
- Preserve People abstract TPH and Identity linkage via `People.IdentityUserId`.
- Preserve domain relationship/expertise invariants.
- DTO-only API boundaries.
- Program pipeline/order and hardened security defaults must remain correct.
- Config-first addressing; no secret/url hardcoding.
- Keep `appsettings.Local.json` local-only: it is gitignored and must stay excluded from build/publish output via the project file.

## Data + EF
- Provider: `Npgsql.EntityFrameworkCore.PostgreSQL`.
- Central model configuration lives in `Data/AutoServiceDbContext.cs`.
- EF migrations live under `Data/Migrations`.
- Use async EF I/O with cancellation tokens.

## Current API Contract Anchors
- Vehicle contracts use `Vin`, `EnginePowerKw`, and `DrivetrainType`; supported drivetrain values are `Petrol`, `Diesel`, `Hybrid`, `PHEV`, and `Electric`. Do not reintroduce HP or torque DTO fields.
- Customer list/search includes related `VehicleLicensePlates`; scheduler lookup endpoints include email, exact license plate, and name multi-result lookup.
- Scheduler intake payloads must keep nested vehicle creation aligned with VIN, kW, and drivetrain fields.

## Auth/Security
- Mechanics-only login/register policy remains enforced.
- Preserve Identity + JWT + cookie session behavior, including refresh rotation and denylist enforcement.
- Keep secrets out of repo and fail fast on placeholder secret markers.

## Operational Anchors (Runtime Behavior)
- **Auth cookies**: `autoservice_at` (access token, 10 minutes), `autoservice_rt` (refresh token, 7 days).
- **Rate limits**: login `10/min per IP`, refresh `20/min per IP`.
- **Lockout**: 5 failed password attempts -> 15 minutes.
- **Login ban**: 3-minute temporary ban after rate-limit rejection (enforced by `LoginBanMiddleware`).
- **Middleware order** (in `Program.cs`): `ForwardedHeaders` -> `HttpsRedirection` -> `SecurityHeadersMiddleware` -> `LoginBanMiddleware` -> `RateLimiter` -> `CORS` -> `AuditAccessDeniedMiddleware` -> `Authentication` -> `Authorization`.
- **Endpoint mapping order** (in `Program.cs`): `MapAuthEndpoints` -> `MapAppointmentEndpoints` -> `MapProfileEndpoints` -> `MapAdminEndpoints` -> `MapCustomerEndpoints` -> `MapVehicleEndpoints` -> `MapDefaultEndpoints`.
- **Profile picture**: ETag-based caching via `BuildProfilePictureEtag`, SSE real-time updates via `GET /api/profile/picture/updates`.
- **Data seeding**: `DemoDataInitializer.EnsureSeededAsync()` runs on startup to apply pending migrations and conditionally insert demo data.

## Source-of-Truth Files
- Endpoint mapping: `Auth/Endpoints/`, `Appointments/`, `Customers/`, `Vehicles/`, `Profile/Endpoints/`, `Admin/` endpoint mappers.
- Auth session: `Auth/Session/AuthCookieNames.cs`, `Auth/Endpoints/AuthEndpoints.Helpers.cs` (cookie TTLs, JTI denylist).
- Middleware: `Middleware/SecurityHeadersMiddleware.cs`, `Middleware/LoginBanMiddleware.cs`, `Middleware/AuditAccessDeniedMiddleware.cs`.
- Data/seeding: `Data/AutoServiceDbContext.cs`, `Data/Migrations/`, `Data/DemoDataInitializer.cs`, `DataInitialization/Bootstrap*` classes.
- Pipeline/config: `Program.cs`, `appsettings*.json`, `AutoService.ApiService.csproj`, `Configuration/ConnectionStringResolver.cs`, `Configuration/TemplateMarkerDetector.cs`.

## Engineering Standards
- Apply SOLID and OOP for all non-trivial code changes.
- Prefer explicit abstractions and low coupling over large monolithic handlers.
- Use GoF patterns where they reduce branching/duplication and improve extension.
- Document engineering rationale for non-trivial design changes.

## Decomposition Guardrails
- No god files/classes/methods.
- Source files > 500 lines must be split.
- Test files > 250 lines must be split.
- Classes/services > 300 lines must be split by responsibility.
- Methods/functions should be <= 60 lines where practical.

## Routing Gates
- `migration`: only when schema/EF delta exists.
- `http-endpoint-test`: only explicit request or significant API endpoint/contract behavior change.
- `sql-database-test`: only explicit request or significant schema/persistence behavior change.
- `e2e-playwright-test`: only explicit request or significant frontend structural/UI flow change.
- Heavy test triggered by new feature -> generate missing coverage first.
- Use `python scripts/run-local-test-suite.py http` or `python scripts/run-local-test-suite.py sql` for triggered API/database validation.
- Use `python scripts/run-local-test-suite.py all` for full local test validation and inspect `tests/.artifacts/test-suite-summary.json`; never publish raw `.env`, `.secrets`, local MCP config, connection strings, or unsanitized command output.

## Always-On
- `docs-sync` always, auto-remediate docs drift.
- `coding-principles` always for class/method changes, auto-remediate quality drift.
- Backend security remediation in workflow:
  - `dotnet list package --vulnerable --include-transitive`
  - apply patch/minor updates, re-validate.
