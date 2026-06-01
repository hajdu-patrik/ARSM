# AutoService.ApiService Rules

## Scope and Ownership

- Primary owner: Mark
- Architecture sign-off: Patrik
- Security/testing escalation: Zsombor

## Decision Ownership

- The user owns backend product, architecture, contract, persistence, auth/session, and runtime-composition decisions.
- Do not add or change API behavior, DTO fields, EF schema, auth/session flow, runtime defaults, validation rules, tests, or documentation policy unless explicitly requested, specified by instructions, or agreed in the active plan.
- If backend requirements are ambiguous, ask the user before choosing an approach.

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
- Unsafe cookie-bearing API mutations require an allowed WebUI `Origin` header.
- Rate limits: login `10/min`, refresh `20/min`; lockout after 5 failed attempts for 15 min.
- In-process auth rate limits/login bans are single-instance only; non-Development deployments must explicitly confirm `Deployment:RateLimiterTopology=SingleInstance` or use a distributed limiter.
- Profile picture GET responses keep private browser caching with ETag revalidation and auth/cookie-aware `Vary` headers; SSE update behavior remains intact.
- Read-only profile GET/person lookup paths use `AsNoTracking`; profile mutations keep tracked entities.
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
