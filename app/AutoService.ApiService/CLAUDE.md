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

## Mandatory Always-On

- `docs-sync`: always after changes, auto-remediate doc drift.
- `coding-principles`: always after class/method changes, auto-remediate quality drift.
- Security remediation on backend code workflows: run `dotnet list package --vulnerable --include-transitive`, then apply patch/minor package fixes and re-run validation.

## Source-of-Truth Files

- Endpoint mapping: `Auth/`, `Appointments/`, `Customers/`, `Vehicles/`, `Profile/`, `Admin/` endpoint mappers.
- Pipeline/config: `Program.cs`, `appsettings*.json`, `AutoService.ApiService.csproj`, `Configuration/ConnectionStringResolver.cs`, `Configuration/TemplateMarkerDetector.cs`.
