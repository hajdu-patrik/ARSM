# AutoService.ApiService Rules

## Scope and Ownership

- Primary owner: Mark
- Architecture sign-off: Patrik
- Security/testing escalation: Zsombor

## Hard Invariants

- `People` stays abstract TPH.
- Identity linkage only through `People.IdentityUserId`.
- DTO-only API boundaries (no direct EF entity exposure).
- Config-first addressing; no hardcoded secrets/URLs.

## Contract Anchors

- Vehicle contracts: `Vin`, `EnginePowerKw`, `DrivetrainType` (`Petrol`, `Diesel`, `Hybrid`, `PHEV`, `Electric`).
- Customer list/search keeps `VehicleLicensePlates` exposure.
- Scheduler lookup/intake keeps email, exact plate, name multi-result behavior.

## Auth and Runtime Anchors

- Cookies: `autoservice_at` (10 min), `autoservice_rt` (7 days).
- Rate limits: login `10/min`, refresh `20/min`; lockout after 5 failed attempts for 15 min.
- Preserve middleware and endpoint mapping order in `Program.cs`.

## Engineering and Size Rules

- Apply SOLID/OOP; use GoF patterns only when justified.
- Source > 500, tests > 250, class/service > 300: split required.
- Function/method target <= 60 lines where practical.

## Test and Validation Policy

- `http-endpoint-test` only for explicit request or significant API behavior change.
- `sql-database-test` only for explicit request or significant schema/persistence change.
- `e2e-playwright-test` only for explicit request or significant frontend flow change.
- Use `python scripts/run-local-test-suite.py http|sql|all` and review sanitized summary.

## Always-On for Code Changes

- Run `docs-sync`.
- Run `coding-principles`.
- Run `dotnet list package --vulnerable --include-transitive` and remediate.
