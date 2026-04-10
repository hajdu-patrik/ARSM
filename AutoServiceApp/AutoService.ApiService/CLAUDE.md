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
- `ProgresStatus` enum values: `InProgress`, `Completed`, `Cancelled`. Default on new appointments is `InProgress`.
- `Appointment` entity has `DateTime IntakeCreatedAt`, `DateTime DueDateTime`, `DateTime? CompletedAt`, and `DateTime? CanceledAt`; status transitions auto-set/clear the completion/cancel timestamps.
- `AppointmentDto` includes `IntakeCreatedAt`, `DueDateTime`, `CompletedAt`, and `CanceledAt` fields.
- Never expose EF entities directly from API boundaries — use DTO contracts.

## EF Core

- Provider: `Npgsql.EntityFrameworkCore.PostgreSQL` — use `options.UseNpgsql(...)`.
- Model config centralized in `Data/AutoServiceDbContext.cs`.
- New migrations go in `Data/Migrations`.
- Current migrations: `InitialCreate`, `AddIdentityAndIdentityUserId`, `AddRefreshTokensAndCookieAuth`, `AddProfilePicture`, `AddAppointmentTimestamps`, `BackfillDemoData`, `AddAppointmentIntakeAndDueDateTime`, `AddRevokedJwtTokenDenylist`.
- `DemoDataInitializer.EnsureSeededAsync()` runs on startup: `MigrateAsync()` + ensure Admin role + seed mechanics (with Identity accounts), customers (plain records), vehicles, and appointments when tables are empty. Seeding includes 30 additional generated appointments in the current UTC month (including today and multiple same-day entries).
- Admin role seeding is idempotent and runs on every startup (before the "is data already seeded?" guard), ensuring the `"Admin"` Identity role exists and is assigned to the first mechanic (Gabor Kovacs).
- Legacy migrated/backfilled customer-only states are auto-recovered: if mechanics/identity linkage is missing while customer-side data exists, the initializer resets the inconsistent dataset and reseeds deterministic demo data.
- Outside Development, seeding requires `DemoData:EnableSeeding=true` and `DemoData:MechanicPassword`.
- Startup/seeding fails fast if `ConnectionStrings:AutoServiceDb`, `JwtSettings:Secret`, or `DemoData:MechanicPassword` still contains template placeholder markers (for example `CHANGE_ME` or `SET_UNIQUE_LOCAL`, including punctuation-separated variants).
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
- Registration pre-checks normalized email collisions against both Identity users and domain `People` records (including passive customers) before account creation.
- Registration maps database unique-constraint email races to a controlled validation error on `Email` instead of returning a generic server error.
- Name validation (first name, middle name, last name) is enforced at register, profile update, and customer create/update: names may only contain Unicode letters and hyphens (`^[\p{L}\-]+$`). Validation uses `ContactNormalization.IsValidName()` and error messages from `ValidationMessages`.
- Login accepts email or phone number.
- Identifier normalization is mandatory across register/login:
  - emails are trimmed + lowercased,
  - Hungarian phone inputs (`+36`, `36`, `06`, local national form without prefix like `301112233`, spaced/punctuated forms) normalize to canonical national form with strict prefix/length rules:
    - `361xxxxxxx` (Budapest),
    - `36(20|21|30|31|50|70)xxxxxxx` (mobile/nomadic),
    - `36<approved 2-digit area>xxxxxx` (geographic).
- Register enforces duplicate phone detection on normalized values, including equivalent formats.
- Auth session model is cookie-based:
  - access token in HttpOnly cookie (`autoservice_at`),
  - refresh token in HttpOnly cookie (`autoservice_rt`),
  - persisted hashed refresh token rows in `refreshtokens`.
- Access-token JWT denylist rows are persisted in `revokedjwttokens` and cached in-memory for fast validation checks.
- Login failure semantics: generic `401 invalid_credentials` for unknown identifier and wrong password, `403 mechanic_only_login` when an existing customer email/phone identifier is used, `429` during lockout/rate-limit, `500` when linked domain record is missing.
- Lockout: 5 failed attempts, 15-minute lockout.
- Rate limit: 10 requests/min per client IP for login (`AuthLoginAttempts`) and 20 requests/min for refresh (`AuthRefreshAttempts`). Temporary login-ban window after login rate-limit rejection: 3 minutes.
- JWT lifetime: 10 minutes. Refresh token lifetime: 7 days.
- JWT clock skew: 1 minute. Issuer + audience validation enabled. Minimum secret: 32 bytes.
- Logout revokes refresh token session and denylists current JWT `jti` until token expiry.
- JWT bearer handler reads access token from cookie and rejects denylised `jti` values.

## Auth Endpoints (Current)

- `POST /api/auth/register` (authorized, AdminOnly policy)
- `POST /api/auth/login` (rate-limited)
- `POST /api/auth/refresh` (rate-limited)
- `POST /api/auth/logout` (authorized)
- `GET /api/auth/validate` (authorized)

## Appointment Endpoints (Current)

- `GET /api/appointments?year=&month=` (authorized) — list appointments for a month
- `GET /api/appointments/today` (authorized) — list today's appointments
- `POST /api/appointments/intake` (authorized) — create scheduler intake appointment for selected day; rejects scheduled dates in the past, validates due datetime, resolves customer by email (create fallback), and auto-assigns the requesting mechanic
- `PUT /api/appointments/{id}` (authorized) — update appointment fields only (`scheduledDate`, `dueDateTime`, `taskDescription`); legacy vehicle fields in payload are tolerated but ignored; allowed for assigned mechanics and admins; rejects past ScheduledDate values and rejects ScheduledDate changes when the appointment is already in the past
- `POST /api/customers/{customerId}/appointments` (authorized, AdminOnly) — create an appointment for a customer's vehicle with request validation (vehicle ownership, mechanic IDs, task, scheduled date) and rejects past scheduled dates; returns 201 Created
- `PUT /api/appointments/{id}/claim` (authorized) — current mechanic self-assigns to an appointment; returns 422 if appointment is Cancelled
- `DELETE /api/appointments/{id}/claim` (authorized) — current mechanic self-unassigns from an appointment; returns 422 if appointment is Cancelled or if unassign would leave the appointment without mechanics
- `PUT /api/appointments/{id}/status` (authorized) — update appointment status (assigned mechanic only); auto-sets CompletedAt/CanceledAt timestamps on status change and allows moving Cancelled appointments back to InProgress/Completed (including past-dated appointments)
- `PUT /api/appointments/{id}/assign/{mechanicId}` (authorized, AdminOnly) — admin assigns a mechanic to an appointment; returns 422 if appointment is Cancelled
- `DELETE /api/appointments/{id}/assign/{mechanicId}` (authorized, AdminOnly) — admin removes a mechanic from an appointment; returns 422 if appointment is Cancelled or if removal would leave the appointment without mechanics
- Group root endpoints are mapped without requiring a trailing slash (for example, `/api/appointments` works directly).

## Customer Endpoints (Current)

- `GET /api/customers` (authorized) — list all customers (id, name, email, phone, vehicle count)
- `GET /api/customers/by-email?email=` (authorized) — scheduler customer lookup by normalized email; returns customer with vehicle list
- `GET /api/customers/{id}` (authorized) — get single customer with vehicle list
- `POST /api/customers` (authorized, AdminOnly) — create customer record (firstName, middleName?, lastName, email, phoneNumber?)
- `PUT /api/customers/{id}` (authorized, AdminOnly) — update customer record
- `DELETE /api/customers/{id}` (authorized, AdminOnly) — delete customer and cascaded vehicles
- Customer DTOs: `CustomerDto`, `CreateCustomerRequest`, `UpdateCustomerRequest`.
- Endpoint files follow partial-class pattern in `Customers/` folder (CustomerEndpoints.cs / Contracts / Queries / Mutations).
- Customers are passive records — no Identity account, no `IdentityUserId`.

## Vehicle Endpoints (Current)

- `GET /api/customers/{customerId}/vehicles` (authorized) — list all vehicles for a customer
- `GET /api/vehicles/{id}` (authorized) — get single vehicle with customer summary
- `POST /api/customers/{customerId}/vehicles` (authorized, AdminOnly) — create vehicle for a customer; license plate normalized to uppercase and validated against supported European formatting rules
- `PUT /api/vehicles/{id}` (authorized, AdminOnly) — update vehicle record with the same European license-plate validation rules
- `DELETE /api/vehicles/{id}` (authorized, AdminOnly) — delete vehicle and cascaded appointments
- Vehicle DTOs: `VehicleDetailDto`, `CustomerSummaryDto`, `CreateVehicleRequest`, `UpdateVehicleRequest`.
- Endpoint files follow partial-class pattern in `Vehicles/` folder (VehicleEndpoints.cs / Contracts / Queries / Mutations).

## Profile Endpoints (Current)

- `GET /api/profile` (authorized) — get current user's profile (name, email, phone, picture status)
- `PUT /api/profile` (authorized) — update email, phone number, first name, middle name, last name
- `DELETE /api/profile` (authorized, non-admin only) — delete current user profile after current-password confirmation (logs out and clears auth cookies). Returns 403 if the caller has the Admin role.
- `POST /api/profile/change-password` (authorized) — change password (current + new + confirm)
- `GET /api/profile/picture` (authorized) — get profile picture binary
- `GET /api/profile/picture/{personId}` (authorized) — get mechanic profile picture binary by person id (404 if mechanic/picture missing)
- `GET /api/profile/picture/updates` (authorized) — SSE stream for realtime profile-picture updates (`profile-picture-updated` events), backed by bounded per-subscriber channels (max 200 subscriptions, buffer size 32, drop-oldest overflow mode)
- `PUT /api/profile/picture` (authorized, multipart/form-data) — upload profile picture (JPEG/PNG/WebP, max 512 KB, file bound from form payload). Server validates image magic bytes and rejects MIME/content mismatches.
- `DELETE /api/profile/picture` (authorized) — remove profile picture
- Group root endpoints are mapped without requiring a trailing slash (for example, `/api/profile` works directly).

## Admin Endpoints (Current)

- `GET /api/admin/mechanics` (authorized, AdminOnly policy) — list all mechanics with admin flag and `hasProfilePicture`
- `DELETE /api/admin/mechanics/{id}` (authorized, AdminOnly policy) — delete a mechanic (revokes refresh tokens, removes identity + domain record). Deletion invariants run in a serializable transaction and returns 403 if target is an admin or if caller tries to delete themselves, 422 if deleting the mechanic would leave zero mechanics globally or leave any appointment without an assigned mechanic, 409 on serialization/deadlock/concurrency contention, and 500 if linked Identity user deletion fails (no partial-success response).

## API Documentation

- OpenAPI spec: `GET /openapi/v1.json` (Development only)
- Interactive docs: Scalar API Reference at `/scalar/v1` (Development only)
- Package: `Scalar.AspNetCore` — modern replacement for Swagger UI, works with built-in `Microsoft.AspNetCore.OpenApi`.

## Security Middleware (must preserve order)

`UseHsts` (non-Dev) → `UseForwardedHeaders` → `UseHttpsRedirection` → login ban middleware → `UseRateLimiter` → `UseCors` → `UseAuthentication` → `UseAuthorization`

Login-ban middleware remains in-process and uses deterministic cleanup scheduling (30-second interval) plus a max tracked-client bound (5000) to cap memory growth.

## Configuration

- Connection string key: `ConnectionStrings:AutoServiceDb`
- JWT keys: `JwtSettings:Secret` (min 32 bytes), `JwtSettings:Issuer`, `JwtSettings:Audience`
- Startup fails fast if `ConnectionStrings:AutoServiceDb` or `JwtSettings:Secret` contains template placeholder markers (for example `CHANGE_ME` or `SET_UNIQUE_LOCAL`).
- CORS allowed origins key: `Cors:AllowedOrigins` (explicit origins, `AllowCredentials()` enabled; current API appsettings default is `https://localhost:5173`)
- Forwarded-header trust config: `ForwardedHeaders:ForwardLimit`, `ForwardedHeaders:KnownProxies`, `ForwardedHeaders:KnownNetworks`
- Local overrides: `appsettings.Local.json` (gitignored) or env vars (`ConnectionStrings__AutoServiceDb`, `JwtSettings__Secret`)
- Never commit secrets or credentials.
- For AI-assisted database validation, use `ai_agent_test_user` and execute read-only `SELECT` queries only; never run DML/DDL (`INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `ALTER`, `CREATE`, `DROP`, `GRANT`, `REVOKE`) from AI SQL tooling.

## Code Layout

- `Program.cs` — service registration, middleware, endpoint mapping only. Calls `builder.AddServiceDefaults()` at the top and `app.MapDefaultEndpoints()` last.
- `Auth/` — all auth endpoint files (map/register/login/helpers/contracts).
- `Appointments/` — appointment endpoint files (contracts/helpers/queries/mutations/registration), partial-class pattern mirroring `Auth/`.
- `Profile/` — profile endpoint files (contracts/helpers/queries/mutations/profilepicture), partial-class pattern mirroring `Appointments/`.
- `Admin/` — admin endpoint files (map/contracts/handlers), partial-class pattern. Mechanic list + delete.
- `Customers/` — customer endpoint files (CustomerEndpoints.cs/Contracts/Queries/Mutations), partial-class pattern.
- `Vehicles/` — vehicle endpoint files (VehicleEndpoints.cs/Contracts/Queries/Mutations), partial-class pattern.
- `Configuration/` — startup configuration resolvers (`ConnectionStringResolver`, `JwtSettingsResolver`).
- `Middleware/` — custom middleware classes (`LoginBanMiddleware`).
- `Common/` — cross-cutting reusable utilities (`ContactNormalization`, `TokenSecurity`, `ValidationMessages`); keep email/phone normalization, name validation (`IsValidName`), token hash/expiry parsing, and shared validation error message constants centralized here.
- Cross-cutting logic in dedicated folders/files; keep `Program.cs` clean.
- Keep comments concise and only for non-obvious logic.
