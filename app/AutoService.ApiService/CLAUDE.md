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

## Data + EF
- Provider: `Npgsql.EntityFrameworkCore.PostgreSQL`.
- Central model config: `Data/AutoServiceDbContext.cs`.
- Migrations: `Data/Migrations`.
- Use async EF I/O + cancellation tokens.

## Auth/Security
- Mechanics-only login/register.
- Identity + JWT + cookie session; keep refresh rotation and denylist enforcement.
- Preserve middleware order and hardened defaults.
- Keep secrets out of repo; fail-fast on placeholder secret markers.

## Routing + Testing Policy
- HTTP/SQL/E2E heavy tests: on explicit request or significant behavior change only.
- New feature when heavy tests run: generate missing coverage first.
- Migration agent only when schema/EF delta exists.

## Mandatory Always-On
- `docs-sync`: always after changes, auto-remediate doc drift.
- `coding-principles`: always after class/method changes, auto-remediate quality drift.
- Security remediation on backend code workflows:
  - `dotnet list package --vulnerable --include-transitive`
  - apply patch/minor package fixes, re-run validation.

## Source-of-Truth Files
- Endpoint mapping: `Auth/`, `Appointments/`, `Customers/`, `Vehicles/`, `Profile/`, `Admin/` endpoint mappers.
- Pipeline/config: `Program.cs`, `appsettings*.json`.
