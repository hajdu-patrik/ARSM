---
applyTo: "AutoServiceApp/AutoService.ApiService/**"
description: "Use when editing backend API, auth, EF Core model, migrations, and domain logic in AutoService.ApiService."
---
# AutoService.ApiService Instructions

## Domain Model & Persistence

- Preserve People inheritance as TPH with one people table and discriminator.
- Keep People abstract, with Customer and Mechanic as derived entities.
- Keep Identity linkage through People.IdentityUserId only.
- Keep FullName as owned value object mapping.
- Keep mechanic expertise constraints intact: 1..10 items, unique, non-empty persisted value.
- Keep core relationships:
  - `Customer` 1..* `Vehicle`,
  - `Vehicle` 1..* `Appointment`,
  - `Appointment` *..* `Mechanic` (join table).
- Use DTO contracts at API boundaries, do not expose EF entities directly.
- Prefer async EF methods and cancellation tokens.
- Place new migrations in Data/Migrations.

## Authentication & Security

- Keep auth mechanic-only for registration and login.
- Keep auth registration transactional: IdentityUser + Mechanic domain record in one transaction.
- Keep auth endpoints in Auth folder and avoid expanding Program.cs with endpoint handler logic.
- Prefer splitting large auth endpoint files into focused files in `Auth/` (for example map/register/login/helpers/contracts).
- Keep JWT signing secret externalized (env or local untracked config), minimum 32 bytes.
- Keep login protections: lockout (5 failed attempts, 15 min lockout), rate limit (10 req/min), and temporary ban behavior (3 min) consistent unless explicitly requested.
- JWT token lifetime is 10 minutes.
- JWT validation: issuer/audience validation enabled, lifetime validation enabled, clock skew 1 minute.
- CORS policy must allow WebUI origin; configure via `builder.Services.AddCors()` and `app.UseCors()`.

## API Endpoints (Current)

- `POST /api/auth/register` – Mechanic-only registration; returns IdentityUserId + PersonId + PersonType + Email.
- `POST /api/auth/login` – Email or phone + password → JWT token + profile info + expiration time.
- `POST /api/auth/login` failure semantics: `404 identifier_not_found` (unknown email/phone), `401 password_incorrect` (wrong password), `500` when linked domain record is missing.
- No Customer, Vehicle, or Appointment CRUD endpoints currently implemented.

## Configuration

- Database: PostgreSQL via Aspire (NpgsqlEntityFrameworkCore.PostgreSQL provider).
- Connection string key: `ConnectionStrings:AutoServiceDb`.
- JWT settings: `JwtSettings:Secret` (min 32 bytes), `JwtSettings:Issuer`, `JwtSettings:Audience`.
- Demo seeding: Outside Development, require `DemoData:EnableSeeding=true` and `DemoData:MechanicPassword`.
- Configuration files:
  - `appsettings.json` – Production defaults.
  - `appsettings.Local.json` – Local overrides (gitignored).
  - Environment variables override both.
- Health endpoints: Call `MapDefaultEndpoints()` in Program.cs when health checks are needed (optional).

## EF Core Rules

- Use `options.UseNpgsql(...)` for PostgreSQL.
- Model configuration centralized in `Data/AutoServiceDbContext.cs`.
- Keep schema constraints and indexes aligned with domain invariants.
- `DemoDataInitializer.EnsureSeededAsync()` runs on startup: calls `MigrateAsync()` then seeds mechanics (with Identity accounts) and customers (plain records) when tables are empty.

