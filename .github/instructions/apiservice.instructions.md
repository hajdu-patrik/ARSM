---
applyTo: "AutoServiceApp/AutoService.ApiService/**"
description: "Use when editing backend API, auth, EF Core model, migrations, and domain logic in AutoService.ApiService."
---
# AutoService.ApiService Instructions

- Preserve People inheritance as TPH with one people table and discriminator.
- Keep People abstract, with Customer and Mechanic as derived entities.
- Keep Identity linkage through People.IdentityUserId only.
- Keep FullName as owned value object mapping.
- Keep mechanic expertise constraints intact: 1..10 items, unique, non-empty persisted value.
- Keep auth mechanic-only for registration and login.
- Keep auth registration transactional: IdentityUser + Mechanic domain record in one transaction.
- Keep auth endpoints in Auth folder and avoid expanding Program.cs with endpoint handler logic.
- Keep JWT signing secret externalized (env or local untracked config), minimum 32 bytes.
- Keep login protections: lockout, rate limit, and temporary ban behavior consistent unless explicitly requested.
- Keep EF model configuration centralized in Data/AutoServiceDbContext.cs.
- Place new migrations in Data/Migrations.
- Use DTO contracts at API boundaries, do not expose EF entities directly.
- Prefer async EF methods and cancellation tokens.
