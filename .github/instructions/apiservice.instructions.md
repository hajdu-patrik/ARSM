---
applyTo: "app/AutoService.ApiService/**"
description: "Use when editing ApiService API, auth/session, EF model, migrations, and backend contracts."
---
# ApiService Instructions

## Decision Ownership

- The user owns backend product, architecture, contract, persistence, auth/session, and runtime-composition decisions.
- Do not add or change API behavior, DTO fields, EF schema, auth/session flow, runtime defaults, validation rules, tests, or documentation policy unless explicitly requested, specified by instructions, or agreed in the active plan.
- If backend requirements are ambiguous, ask the user before choosing an approach.

## Enforce

- Keep `People` abstract TPH and identity linkage via `People.IdentityUserId`.
- Keep DTO-only API boundaries.
- Keep config-first runtime addressing and secret handling.
- Preserve middleware and endpoint mapping order in `Program.cs`.

## Contract Anchors

- Vehicle DTO fields: `Vin`, `EnginePowerKw`, `DrivetrainType` (`Petrol`, `Diesel`, `Hybrid`, `PHEV`, `Electric`).
- Customer search/list keeps `VehicleLicensePlates` contract.
- Scheduler lookup/intake keeps email, exact plate, and name multi-result behavior.

## Auth and Runtime Anchors

- Cookies: `autoservice_at` (10 min), `autoservice_rt` (7 days).
- Unsafe cookie-bearing API mutations require an allowed WebUI `Origin` header.
- Rate limits: login `10/min`, refresh `20/min`; lockout after 5 failed attempts for 15 min.
- In-process auth rate limits/login bans are single-instance only; non-Development deployments must explicitly confirm `Deployment:RateLimiterTopology=SingleInstance` or use a distributed limiter.
- Keep profile picture private browser caching, ETag revalidation, auth/cookie-aware `Vary` headers, and SSE update behavior intact.
- Keep read-only profile GET/person lookup paths on `AsNoTracking`; profile mutations keep tracked entities.

## Workflow Rules

- Apply SOLID/OOP boundaries; justify non-trivial pattern/architecture changes.
- Migration only for actual schema/EF delta.
- Schema gate: `dotnet tool run dotnet-ef -- migrations has-pending-model-changes --project AutoService.ApiService` must pass; it runs offline (no database) and fails when entities changed without a matching migration. The EF CLI is pinned in `dotnet-tools.json`.
- Heavy test agents only by gate.
- Always run `docs-sync`, `coding-principles`, and backend vulnerability scan/remediation.
