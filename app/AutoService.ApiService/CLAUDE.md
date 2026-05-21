# AutoService.ApiService Rules

## Persona

- Primary: Mark (backend authority)
- Final architecture sign-off: Patrik
- Security/testing escalation: Zsombor

## Hard Invariants

- `People` stays abstract TPH (no TPT/TPC).
- Identity linkage only through `People.IdentityUserId`.
- Preserve expertise and relationship invariants.
- DTO boundaries only; do not expose EF entities directly.

## Engineering Standards

- Apply SOLID and OOP for non-trivial backend changes.
- Prefer explicit abstractions and low coupling over monolithic handlers.
- Use GoF patterns when they reduce branching/duplication and improve extension.
- Document engineering rationale for non-trivial design changes.

## Decomposition Guardrails

- No god files/classes/methods.
- Source files > 500 lines must be split.
- Test files > 250 lines must be split.
- Classes/services > 300 lines must be split by responsibility.
- Methods/functions should be <= 60 lines where practical.

## Data + EF

- Provider: `Npgsql.EntityFrameworkCore.PostgreSQL`.
- Central model config: `Data/AutoServiceDbContext.cs`.
- Migrations: `Data/Migrations`.
- Use async EF I/O + cancellation tokens.

## Current API Contract Anchors

- Vehicle contracts use `Vin`, `EnginePowerKw`, and `DrivetrainType`; supported drivetrain values are `Petrol`, `Diesel`, `Hybrid`, `PHEV`, and `Electric`. Do not reintroduce HP or torque DTO fields.
- Customer list/search includes related `VehicleLicensePlates`; scheduler lookup endpoints include email, exact license plate, and name multi-result lookup.
- Scheduler intake payloads must keep nested vehicle creation aligned with VIN, kW, and drivetrain fields.

## Auth/Security

- Mechanics-only login/register.
- Identity + JWT + cookie session; keep refresh rotation and denylist enforcement.
- Preserve middleware order and hardened defaults.
- Keep secrets out of repo; fail-fast on placeholder secret markers.
- Keep `appsettings.Local.json` local-only: it is gitignored and must stay excluded from build/publish output via the project file.

## Routing + Testing Policy

- HTTP heavy tests: explicit request or significant API endpoint/contract behavior change only.
- SQL heavy tests: explicit request or significant schema/persistence behavior change only.
- Playwright E2E: explicit request or significant frontend structural/UI flow change only.
- If a new feature triggers a heavy test agent, auto-generate missing coverage first.
- Migration agent only when schema/EF delta exists.
- Use `python scripts/run-local-test-suite.py http` or `python scripts/run-local-test-suite.py sql` for triggered API/database validation.
- Use `python scripts/run-local-test-suite.py all` for full local test validation and inspect `tests/.artifacts/test-suite-summary.json`; never publish raw `.env`, `.secrets`, local MCP config, connection strings, or unsanitized command output.

## Mandatory Always-On

- `docs-sync`: always after changes, auto-remediate doc drift.
- `coding-principles`: always after class/method changes, auto-remediate quality drift.
- Security remediation on backend code workflows: run `dotnet list package --vulnerable --include-transitive`, then apply patch/minor package fixes and re-run validation.

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
