---
applyTo: "app/AutoService.ApiService/**"
description: "Use when editing ApiService API, auth/session, EF model, migrations, and backend contracts."
---
# ApiService Instructions

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
- Rate limits: login `10/min`, refresh `20/min`; lockout after 5 failed attempts for 15 min.
- Keep profile picture ETag + SSE update behavior intact.

## Workflow Rules

- Apply SOLID/OOP boundaries; justify non-trivial pattern/architecture changes.
- Migration only for actual schema/EF delta.
- Heavy test agents only by gate.
- Always run `docs-sync`, `coding-principles`, and backend vulnerability scan/remediation.
