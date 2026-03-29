# AutoService.ApiService — Domain & API Rules

## Domain Model Constraints
- `People` is abstract, TPH. Discriminator column on `people` table. Never change to TPT/TPC.
- `FullName` is an owned value object on `People`.
- Identity linkage only via `People.IdentityUserId`. No password/credential fields on `People`, `Customer`, or `Mechanic`.
- Mechanic expertise: 1–10 items, unique, never empty when persisted.
- Core relationships:
  - `Customer` 1..* `Vehicle`
  - `Vehicle` 1..* `Appointment`
  - `Appointment` *..*  `Mechanic` (join table)
- Never expose EF entities directly from API boundaries — use DTO contracts.

## EF Core
- Provider: `Npgsql.EntityFrameworkCore.PostgreSQL` — use `options.UseNpgsql(...)`.
- Model config centralized in `Data/AutoServiceDbContext.cs`.
- New migrations go in `Data/Migrations`.
- Current migrations: `InitialCreate`, `AddIdentityAndIdentityUserId`.
- `DemoDataInitializer.EnsureSeededAsync()` runs on startup: `MigrateAsync()` + seed mechanics (with Identity accounts) + customers (plain records) when tables are empty.
- Outside Development, seeding requires `DemoData:EnableSeeding=true` and `DemoData:MechanicPassword`.
- Prefer async EF methods (`SaveChangesAsync`, `ToListAsync`, etc.) with cancellation tokens.

## Auth Implementation
- Mechanic-only registration and login. Customers have no Identity account.
- Registration is transactional: `IdentityUser` + `Mechanic` domain record created together, linked by `IdentityUserId`.
- Login accepts email or phone number.
- Login failure semantics: `404 identifier_not_found` (unknown), `401 password_incorrect` (wrong password), `500` when linked domain record is missing.
- Lockout: 5 failed attempts, 15-minute lockout.
- Rate limit: 10 requests/min per client IP, policy `AuthLoginAttempts`. Temporary ban after rate-limit rejection: 3 minutes.
- JWT lifetime: 10 minutes. Clock skew: 1 minute. Issuer + audience validation enabled. Minimum secret: 32 bytes.

## Security Middleware (must preserve order)
`UseHttpsRedirection` → `UseHsts` (non-Dev) → `UseRateLimiter` → `UseAuthentication` → `UseAuthorization`

## Configuration
- Connection string key: `ConnectionStrings:AutoServiceDb`
- JWT keys: `JwtSettings:Secret` (min 32 bytes), `JwtSettings:Issuer`, `JwtSettings:Audience`
- Local overrides: `appsettings.Local.json` (gitignored) or env vars (`ConnectionStrings__AutoServiceDb`, `JwtSettings__Secret`)
- Never commit secrets or credentials.

## Code Layout
- `Program.cs` — service registration, middleware, endpoint mapping only.
- `Auth/` — all auth endpoint files (map/register/login/helpers/contracts).
- Cross-cutting logic in dedicated folders/files; keep `Program.cs` clean.
- Keep comments concise and only for non-obvious logic.
