# AutoService.ApiService — Domain & API Rules

## Domain Model Constraints

- `People` is abstract, TPH. Discriminator column on `people` table. Never change to TPT/TPC.
- `FullName` is an owned value object on `People`.
- Identity linkage only via `People.IdentityUserId`. No password/credential fields on `People`, `Customer`, or `Mechanic`.
- `People.ProfilePicture` (`byte[]?`) and `People.ProfilePictureContentType` (`string?`, max 50) — optional binary profile picture storage.
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
- Current migrations: `InitialCreate`, `AddIdentityAndIdentityUserId`, `AddRefreshTokensAndCookieAuth`, `AddProfilePicture`.
- `DemoDataInitializer.EnsureSeededAsync()` runs on startup: `MigrateAsync()` + ensure Admin role + seed mechanics (with Identity accounts) + customers (plain records) when tables are empty.
- Admin role seeding is idempotent and runs on every startup (before the "is data already seeded?" guard), ensuring the `"Admin"` Identity role exists and is assigned to the first mechanic (Gabor Kovacs).
- Outside Development, seeding requires `DemoData:EnableSeeding=true` and `DemoData:MechanicPassword`.
- Prefer async EF methods (`SaveChangesAsync`, `ToListAsync`, etc.) with cancellation tokens.

## Authorization & Roles

- ASP.NET Identity Roles enabled via `.AddRoles<IdentityRole>()`.
- Named policy `"AdminOnly"` requires `ClaimTypes.Role == "Admin"`.
- JWT tokens include role claims via `UserManager.GetRolesAsync()` — added as `ClaimTypes.Role`.
- `CreateJwtTokenAsync` is async and accepts `UserManager<IdentityUser>` to resolve roles.
- All auth responses (`LoginResponse`, `RefreshResponse`, `ValidateTokenResponse`) include `bool IsAdmin`.

## Auth Implementation

- Mechanic-only registration and login. Customers have no Identity account.
- Registration is admin-only: requires `"AdminOnly"` authorization policy (caller must have `"Admin"` role in JWT).
- Registration is transactional: `IdentityUser` + `Mechanic` domain record created together, linked by `IdentityUserId`.
- Login accepts email or phone number.
- Identifier normalization is mandatory across register/login:
  - emails are trimmed + lowercased,
  - Hungarian phone inputs (`+36`, `36`, `06`, spaced/punctuated forms) normalize to canonical national form with strict prefix/length rules:
    - `361xxxxxxx` (Budapest),
    - `36(20|21|30|31|50|70)xxxxxxx` (mobile/nomadic),
    - `36<approved 2-digit area>xxxxxx` (geographic).
- Register enforces duplicate phone detection on normalized values, including equivalent formats.
- Auth session model is cookie-based:
  - access token in HttpOnly cookie (`autoservice_at`),
  - refresh token in HttpOnly cookie (`autoservice_rt`),
  - persisted hashed refresh token rows in `refreshtokens`.
- Login failure semantics: generic `401 invalid_credentials` for unknown identifier and wrong password, `403 mechanic_only_login` when an existing customer email/phone identifier is used, `429` during lockout/rate-limit, `500` when linked domain record is missing.
- Lockout: 5 failed attempts, 15-minute lockout.
- Rate limit: 10 requests/min per client IP, policy `AuthLoginAttempts`. Temporary ban after rate-limit rejection: 3 minutes.
- JWT lifetime: 10 minutes. Refresh token lifetime: 7 days.
- JWT clock skew: 1 minute. Issuer + audience validation enabled. Minimum secret: 32 bytes.
- Logout revokes refresh token session and denylists current JWT `jti` until token expiry.
- JWT bearer handler reads access token from cookie and rejects denylised `jti` values.

## Auth Endpoints (Current)

- `POST /api/auth/register` (authorized, AdminOnly policy)
- `POST /api/auth/login` (rate-limited)
- `POST /api/auth/refresh`
- `POST /api/auth/logout` (authorized)
- `GET /api/auth/validate` (authorized)

## Appointment Endpoints (Current)

- `GET /api/appointments?year=&month=` (authorized) — list appointments for a month
- `GET /api/appointments/today` (authorized) — list today's appointments
- `PUT /api/appointments/{id}/claim` (authorized) — current mechanic claims an appointment
- `PUT /api/appointments/{id}/status` (authorized) — update appointment status (assigned mechanic only)
- Group root endpoints are mapped without requiring a trailing slash (for example, `/api/appointments` works directly).

## Profile Endpoints (Current)

- `GET /api/profile` (authorized) — get current user's profile (name, email, phone, picture status)
- `PUT /api/profile` (authorized) — update email, phone number, middle name
- `DELETE /api/profile` (authorized, non-admin only) — delete current user profile after current-password confirmation (logs out and clears auth cookies). Returns 403 if the caller has the Admin role.
- `POST /api/profile/change-password` (authorized) — change password (current + new + confirm)
- `GET /api/profile/picture` (authorized) — get profile picture binary
- `PUT /api/profile/picture` (authorized, multipart/form-data) — upload profile picture (JPEG/PNG/WebP, max 512 KB, file bound from form payload)
- `DELETE /api/profile/picture` (authorized) — remove profile picture
- Group root endpoints are mapped without requiring a trailing slash (for example, `/api/profile` works directly).

## Admin Endpoints (Current)

- `GET /api/admin/mechanics` (authorized, AdminOnly policy) — list all mechanics with admin flag
- `DELETE /api/admin/mechanics/{id}` (authorized, AdminOnly policy) — delete a mechanic (revokes refresh tokens, removes identity + domain record). Returns 403 if target is an admin or if caller tries to delete themselves.

## API Documentation

- OpenAPI spec: `GET /openapi/v1.json` (Development only)
- Interactive docs: Scalar API Reference at `/scalar/v1` (Development only)
- Package: `Scalar.AspNetCore` — modern replacement for Swagger UI, works with built-in `Microsoft.AspNetCore.OpenApi`.

## Security Middleware (must preserve order)

`UseHttpsRedirection` → `UseHsts` (non-Dev) → login ban middleware → `UseRateLimiter` → `UseCors` → `UseAuthentication` → `UseAuthorization`

## Configuration

- Connection string key: `ConnectionStrings:AutoServiceDb`
- JWT keys: `JwtSettings:Secret` (min 32 bytes), `JwtSettings:Issuer`, `JwtSettings:Audience`
- CORS allowed origins key: `Cors:AllowedOrigins` (explicit origins, `AllowCredentials()` enabled)
- Local overrides: `appsettings.Local.json` (gitignored) or env vars (`ConnectionStrings__AutoServiceDb`, `JwtSettings__Secret`)
- Never commit secrets or credentials.

## Code Layout

- `Program.cs` — service registration, middleware, endpoint mapping only.
- `Auth/` — all auth endpoint files (map/register/login/helpers/contracts).
- `Appointments/` — appointment endpoint files (contracts/helpers/queries/mutations/registration), partial-class pattern mirroring `Auth/`.
- `Profile/` — profile endpoint files (contracts/helpers/queries/mutations/profilepicture), partial-class pattern mirroring `Appointments/`.
- `Admin/` — admin endpoint files (map/contracts/handlers), partial-class pattern. Mechanic list + delete.
- `Configuration/` — startup configuration resolvers (`ConnectionStringResolver`, `JwtSettingsResolver`).
- `Middleware/` — custom middleware classes (`LoginBanMiddleware`).
- Cross-cutting logic in dedicated folders/files; keep `Program.cs` clean.
- Keep comments concise and only for non-obvious logic.
