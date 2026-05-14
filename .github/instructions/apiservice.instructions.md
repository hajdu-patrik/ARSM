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

## Source-of-Truth Files
- Endpoint mapping: `Auth/`, `Appointments/`, `Customers/`, `Vehicles/`, `Profile/`, `Admin/` endpoint mappers.
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

## Always-On
- `docs-sync` always, auto-remediate docs drift.
- `coding-principles` always for class/method changes, auto-remediate quality drift.
- Backend security remediation in workflow:
  - `dotnet list package --vulnerable --include-transitive`
  - apply patch/minor updates, re-validate.
