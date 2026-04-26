---
applyTo: "app/AutoService.ApiService/**"
description: "Use when editing backend API, auth, EF Core model, migrations, and domain logic in AutoService.ApiService."
---
# AutoService.ApiService Instructions

## Code Documentation Style

- For new or changed non-trivial classes/methods, use JSDoc-style block comments.
- Do not use XML documentation comments (`/// <summary>`, `/// <param>`, `/// <returns>`).
- When code changes introduce/modify classes or methods, use the `coding-principles` agent.

## Domain Model & Persistence

- Preserve People inheritance as TPH with one people table and discriminator.
- Keep People abstract, with Customer and Mechanic as derived entities.
- Keep Identity linkage through People.IdentityUserId only.
- Keep FullName as owned value object mapping.
- Keep mechanic expertise constraints intact: 1..10 items, unique, non-empty persisted value. The `> 10` upper-bound must be enforced by `ValidateRegisterRequest` before persistence (returns `422`), not solely by the DB constraint.
- Keep core relationships:
  - `Customer` 1..* `Vehicle`,
  - `Vehicle` 1..* `Appointment`,
  - `Appointment` *..* `Mechanic` (join table).
- `ProgresStatus` enum values: `InProgress`, `Completed`, `Cancelled`. Default on new appointments is `InProgress` (there is no `Scheduled` value).
- `Appointment` entity has `DateTime IntakeCreatedAt`, `DateTime DueDateTime`, `DateTime? CompletedAt`, and `DateTime? CanceledAt`; status transitions auto-set/clear completion/cancel timestamps.
- `AppointmentDto` includes `IntakeCreatedAt`, `DueDateTime`, `CompletedAt`, and `CanceledAt` fields.
- Use DTO contracts at API boundaries, do not expose EF entities directly.
- Prefer async EF methods and cancellation tokens.
- Place new migrations in Data/Migrations.
- Current migrations are: `InitialCreate`, `AddIdentityAndIdentityUserId`, `AddRefreshTokensAndCookieAuth`, `AddProfilePicture`, `AddAppointmentTimestamps`, `BackfillDemoData`, `AddAppointmentIntakeAndDueDateTime`, `AddRevokedJwtTokenDenylist`, `NormalizePhoneNumbersToE164`.

## Authentication & Security

- Keep auth mechanic-only for registration and login.
- Keep auth registration transactional: IdentityUser + Mechanic domain record in one transaction.
- Keep auth endpoints in Auth folder and avoid expanding Program.cs with endpoint handler logic.
- Prefer splitting large auth endpoint files into focused files in `Auth/` (for example map/register/login/helpers/contracts).
- Keep JWT signing secret externalized (env or local untracked config), minimum 32 bytes.
- Startup must fail fast if `JwtSettings:Secret` still contains template placeholder markers (for example `CHANGE_ME` or `SET_UNIQUE_LOCAL`, including punctuation-separated variants).
- Keep login protections: lockout (5 failed attempts, 15 min lockout), rate limit (10 req/min), and temporary ban behavior (3 min) consistent unless explicitly requested.
- Keep login-ban middleware in-process behavior deterministic: 30-second cleanup interval and max tracked-client bound (5000).
- `AuditAccessDeniedMiddleware` (`Middleware/AuditAccessDeniedMiddleware.cs`) must remain registered between `UseCors` and `UseAuthentication`. It logs a structured `LogWarning` under logger category `Auth.AccessDenied` for every `401` or `403` response, including `StatusCode`, `MechanicId` (from `person_id` claim), `Method`, `Path`, and hashed `ClientIp` (`sha256:<12hex>`) structured properties.
- Auth log events (login success, login failure, login lockout, refresh success, refresh revoked-token reuse) must include a `ClientIp` structured property. Use `ResolveClientIpAddress(httpContext)` computed once per handler and reuse it for both log calls and the `CreatedByIpAddress` field on new `RefreshToken` DB rows.
- Keep auth input normalization consistent across register/login:
  - emails are trimmed + lowercased,
  - phone numbers are normalized to canonical E.164 (`+{countryCode}{nationalNumber}`),
  - accepted phone numbers must be valid European numbers according to libphonenumber and the backend European country-code allowlist.
- Registration must pre-check normalized email collisions against both Identity users and domain `People` records (including passive customers).
- Registration must map unique-constraint email races to the same generic validation response used by duplicate pre-checks (for example `register`) to avoid account enumeration.
- Keep contact normalization, name validation, token-security helpers, person-type resolution, image content-type detection, and shared validation error message constants centralized in the current grouped top-level folders and reuse them from endpoint files:
  - `Normalization/ContactNormalization.cs`
  - `Security/TokenSecurity.cs`
  - `Validation/ValidationMessages.cs`
  - `Identity/PersonTypeResolver.cs`
  - `Validation/ImageContentTypeDetector.cs`
  - `Validation/NameFieldsValidator.cs` — centralized name-field validation; `ValidateNames()` for dict-based patterns (used by auth register), `GetNameError()` for early-return patterns (used by customer, appointment, and profile endpoints)
  - `Validation/VehicleNumericValidation.cs` — year/numeric constants (`MinYear`=1886, `MaxYear`=2100, `MaxMileageKm`, `MaxEnginePowerHp`, `MaxEngineTorqueNm`) and `GetYearValidationError()`/`GetValidationError()` helpers used by vehicle create/update and appointment endpoints
- Name fields (first name, middle name, last name) must be validated using `NameFieldsValidator` (which delegates to `ContactNormalization.IsValidName()` with pattern `^[\p{L}\-]+$`) at registration, profile update, and customer create/update. Use `ValidationMessages` constants for error messages.
- Registration must reject duplicate phone numbers even when equivalent values are provided in different formats.
- JWT token lifetime is 10 minutes.
- JWT validation: issuer/audience validation enabled, lifetime validation enabled, clock skew 30 seconds.
- Keep cookie auth secure defaults for auth cookies (HttpOnly, Secure, SameSite, explicit Path).
- CORS policy must allow explicit WebUI origins with credentials, restricted methods (`GET`, `POST`, `PUT`, `DELETE`), and restricted headers (`Content-Type`); configure via `Cors:AllowedOrigins`, `builder.Services.AddCors()`, and `app.UseCors()`. Current API appsettings default origin is `https://localhost:5173`.
- For AI-assisted database verification, use `ai_agent_test_user` and run read-only `SELECT` queries only; never execute DML/DDL (`INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `ALTER`, `CREATE`, `DROP`, `GRANT`, `REVOKE`) from AI SQL tooling.

## API Endpoints (Current)

- `POST /api/auth/register` – Mechanic registration endpoint (AdminOnly); returns `RegisterResponse(PersonId, PersonType, Email)`. `IdentityUserId` is not included in the response.
- `POST /api/auth/login` – Email or phone + password → sets access + refresh cookies and returns profile info + expiration time.
- `POST /api/auth/refresh` – Rotates refresh token and reissues access cookie (rate-limited by `AuthRefreshAttempts`).
- `POST /api/auth/logout` – Revokes refresh token session, denylists current JWT `jti`, clears auth cookies.
- `GET /api/auth/validate` – Returns person linkage data for valid authenticated session.
- `POST /api/auth/login` accepts normalized email/phone identifier input and supports backward-compatible phone-in-email field fallback.
- `POST /api/auth/login` failure semantics: generic `401 invalid_credentials` for unknown identifier, wrong password, when a linked mechanic domain record is missing, and when an existing customer email/phone identifier is used (to reduce account enumeration); `429` for lockout/rate-limit.

### Profile Endpoints (`/api/profile`) — all require authorization

- `GET /api/profile` — Get current user's profile data (name, email, phone, picture status).
- `PUT /api/profile` — Update email, phone number, first name, middle name, last name. Email/phone normalized and uniqueness-checked; first/last name cannot be set to empty.
- `DELETE /api/profile` — Delete current user's profile after validating current password. Returns 403 if caller is admin. Clears auth cookies and invalidates active session. `tokenDenylistService.RevokeAsync()` is called before `transaction.CommitAsync()` to ensure the JWT is denylisted atomically with the deletion.
- `POST /api/profile/change-password` — Change password (CurrentPassword + NewPassword + ConfirmNewPassword). Uses Identity `ChangePasswordAsync`.
- `GET /api/profile/picture` — Serve profile picture binary with content type header; include `ETag` and `Cache-Control: public, max-age=3600`, and return `304 Not Modified` when `If-None-Match` matches.
- `GET /api/profile/picture/{personId}` — Serve mechanic profile picture binary by mechanic person id (authorized; 404 if mechanic/picture missing); include `ETag` and `Cache-Control: public, max-age=3600`, and return `304 Not Modified` when `If-None-Match` matches.
- `GET /api/profile/picture/updates` — Server-Sent Events stream for profile-picture updates (`profile-picture-updated` events with personId/hasProfilePicture/cacheBuster payload), backed by bounded per-subscriber channels (max 200 subscriptions globally, max 5 subscriptions per user, buffer size 32, drop-oldest overflow mode).
- `PUT /api/profile/picture` — Upload profile picture (multipart/form-data, file bound from form payload). Max 512 KB, JPEG/PNG/WebP only. Server validates image magic bytes and rejects declared MIME/content mismatches.
- `DELETE /api/profile/picture` — Remove profile picture.
- Group root endpoints are mapped without requiring a trailing slash (for example, `/api/profile` works directly).
- Profile DTOs: `ProfileResponse`, `UpdateProfileRequest` (Email?, PhoneNumber?, FirstName?, MiddleName?, LastName?), `ChangePasswordRequest`, `DeleteProfileRequest`.
- Endpoint files follow partial-class pattern in `Profile/` folder (mirroring `Appointments/` structure: contracts/helpers/queries/mutations/profilepicture).

### Admin Endpoints (`/api/admin`) — all require AdminOnly authorization

- `GET /api/admin/mechanics` — List all mechanics with admin flag and `hasProfilePicture`; uses a Select projection so `ProfilePicture` blobs are never materialized in memory.
- `DELETE /api/admin/mechanics/{id}` — Delete a mechanic (revokes refresh tokens, removes identity + domain record). Runs deletion invariant checks in a serializable transaction and returns 403 if target is admin or caller is deleting themselves, 422 if deleting would leave zero mechanics globally or would leave any appointment without assigned mechanics, 409 when concurrent contention causes serialization/deadlock/concurrency conflicts, and 500 if linked Identity user deletion fails (no partial-success response).
- Endpoint files follow partial-class pattern in `Admin/` folder (contracts/handlers).

### Customer Endpoints (`/api/customers`) — all require authorization; write operations require AdminOnly

- `GET /api/customers` — List all customers (id, name, email, phone, vehicleCount).
- `GET /api/customers/by-email?email=` — Scheduler lookup by normalized customer email. Returns customer details with vehicles; mechanic email lookups also return `200` for own-car intake even if the linked customer record is not yet materialized (empty vehicle list); `404` if not found, `422` for invalid email.
- `GET /api/customers/{id}` — Get single customer with embedded vehicle list.
- `POST /api/customers` (AdminOnly) — Create a customer record (firstName, middleName?, lastName, email, phoneNumber?). Returns 201 Created. Returns 409 on duplicate email, 422 on missing required fields.
- `PUT /api/customers/{id}` (AdminOnly) — Update customer record. Returns 204 No Content. Returns 404/409/422 as appropriate.
- `DELETE /api/customers/{id}` (AdminOnly) — Delete customer and cascade vehicles. Returns 204 No Content, 404 if not found.
- Customer DTOs: `CustomerDto`, `CreateCustomerRequest`, `UpdateCustomerRequest`.
- Endpoint files follow partial-class pattern in `Customers/` folder (CustomerEndpoints.cs / Contracts / Queries / Mutations).
- Customers are passive records — no Identity account, no `IdentityUserId`.

### Vehicle Endpoints — all require authorization; write operations require AdminOnly

- `GET /api/customers/{customerId}/vehicles` — List all vehicles for a customer. Returns 404 if customer not found.
- `GET /api/vehicles/{id}` — Get single vehicle with customer summary. Returns 404 if not found.
- `POST /api/customers/{customerId}/vehicles` (AdminOnly) — Create a vehicle for a customer. License plate is normalized to uppercase and must match supported European formatting (Latin/Greek/Cyrillic letters + digits with common separators). Returns 201 Created. Returns 404 if customer not found, 409 on duplicate plate, 422 on validation errors.
- `PUT /api/vehicles/{id}` (AdminOnly) — Update vehicle record with the same European license-plate validation rules. Returns 204 No Content. Returns 404/409/422 as appropriate.
- `DELETE /api/vehicles/{id}` (AdminOnly) — Delete vehicle and cascade appointments. Returns 204 No Content, 404 if not found.
- Vehicle DTOs: `VehicleDetailDto`, `CustomerSummaryDto`, `CreateVehicleRequest`, `UpdateVehicleRequest`.
- Endpoint files follow partial-class pattern in `Vehicles/` folder (VehicleEndpoints.cs / Contracts / Queries / Mutations).

### Appointment Endpoints (`/api/appointments`) — all require authorization

- `GET /api/appointments?year=&month=` — List appointments for a given month (defaults to current month if omitted; year: 2000-2100, month: 1-12).
- `GET /api/appointments/today` — List today's UTC-range appointments.
- `POST /api/appointments/intake` — Scheduler intake creation endpoint. Requires customer email, scheduled date, due datetime, and task description. Looks up customer by normalized email (creates customer when missing), and for not-found lookups allows intake without manual `CustomerFirstName`/`CustomerLastName` when the email belongs to a mechanic so backend can resolve mechanic-email owner linking via generated customer-owner linkage email and create/use the linked customer record. Accepts either `vehicleId` or new `vehicle` payload, enforces vehicle numeric max constraints for new-vehicle payloads, always creates `InProgress` appointment, and auto-assigns the requesting mechanic.
- `PUT /api/appointments/{id}` — Update appointment fields (`dueDateTime`, `taskDescription`); `scheduledDate` is always immutable. Customer/vehicle fields are unchanged by this endpoint. Allowed for assigned mechanics or admins.
- `PUT /api/appointments/{id}/vehicle` — Update linked vehicle fields (`licensePlate`, `brand`, `model`, `year`, `mileageKm`, `enginePowerHp`, `engineTorqueNm`) for an appointment. Allowed for assigned mechanics or admins.
- `POST /api/customers/{customerId}/appointments` (AdminOnly) — Create an appointment for a customer's vehicle. Validates positive `vehicleId`, non-empty `taskDescription` (max 200), unique positive `mechanicIds`, required `scheduledDate`, customer/vehicle existence and ownership, and mechanic IDs. Returns 201 Created.
- `PUT /api/appointments/{id}/claim` — Current mechanic (from JWT `person_id`) self-assigns to an appointment only when status is `InProgress`. Returns 409 if already claimed (race-condition uniqueness violations caught via `PostgresException { SqlState: UniqueViolation }`, not broad `DbUpdateException`), returns `422` with code `appointment_cancelled` if appointment is Cancelled, and returns `422` with code `appointment_not_in_progress` for other non-`InProgress` statuses.
- `DELETE /api/appointments/{id}/claim` — Current mechanic (from JWT `person_id`) self-unassigns from an appointment. Returns 409 if not assigned, returns `422` with code `appointment_cancelled` if appointment is Cancelled, returns `422` with code `appointment_completed` if appointment is Completed, or returns `422` if unassign would leave the appointment without assigned mechanics.
- `PUT /api/appointments/{id}/status` — Update appointment status (requesting mechanic must be assigned). Validates status enum (`InProgress`, `Completed`, `Cancelled`), returns 403 if not assigned. Auto-sets `CompletedAt` when transitioning to Completed, `CanceledAt` when transitioning to Cancelled; clears both when transitioning back to InProgress. Cancelled appointments can be moved back to `InProgress` or `Completed`, including for past-dated appointments.
- `PUT /api/appointments/{id}/assign/{mechanicId}` (AdminOnly) — Admin assigns any mechanic to an appointment. Returns 404 if mechanic/appointment not found, 409 if already assigned (race-condition uniqueness violations caught via `PostgresException { SqlState: UniqueViolation }`, not broad `DbUpdateException`), returns `422` with code `appointment_cancelled` if appointment is Cancelled, or returns `422` with code `appointment_completed` if appointment is Completed.
- `DELETE /api/appointments/{id}/assign/{mechanicId}` (AdminOnly) — Admin removes any mechanic from an appointment. Returns 404 if appointment not found, 409 if not assigned, returns `422` with code `appointment_cancelled` if appointment is Cancelled, returns `422` with code `appointment_completed` if appointment is Completed, or returns `422` if removal would leave the appointment without assigned mechanics.
- Group root endpoints are mapped without requiring a trailing slash (for example, `/api/appointments` works directly).
- Appointment DTOs: `AppointmentDto` (includes `IntakeCreatedAt` and `DueDateTime`), `VehicleDto`, `CustomerSummaryDto`, `MechanicSummaryDto`, `UpdateStatusRequest`, `UpdateAppointmentRequest`, `UpdateAppointmentVehicleRequest`, `SchedulerCreateIntakeRequest`.
- Endpoint files follow partial-class pattern in `Appointments/` folder (mirroring `Auth/` structure).

## API Documentation

- OpenAPI spec: `GET /openapi/v1.json` (Development only, via `Microsoft.AspNetCore.OpenApi`).
- Interactive docs: Scalar API Reference at `/scalar/v1` (Development only, via `Scalar.AspNetCore`).
- Endpoint mapper registrations declare explicit OpenAPI response metadata (`Produces`, `ProducesProblem`, `ProducesValidationProblem`) so status/body documentation in OpenAPI/Scalar stays accurate without changing runtime behavior.

## Configuration

- Database: PostgreSQL via Aspire (NpgsqlEntityFrameworkCore.PostgreSQL provider).
- Connection string key: `ConnectionStrings:AutoServiceDb`.
- JWT settings: `JwtSettings:Secret` (min 32 bytes), `JwtSettings:Issuer`, `JwtSettings:Audience`.
- Startup must fail fast if `ConnectionStrings:AutoServiceDb` or `JwtSettings:Secret` contains template placeholder markers (for example `CHANGE_ME` or `SET_UNIQUE_LOCAL`, including punctuation-separated variants).
- Outside Development, startup must fail fast if `AllowedHosts` is missing/empty or contains wildcard (`*`) or `localhost`.
- CORS settings: `Cors:AllowedOrigins` (required explicit origins for credentialed cross-origin requests).
- Forwarded-header trust settings: `ForwardedHeaders:ForwardLimit`, `ForwardedHeaders:KnownProxies`, `ForwardedHeaders:KnownNetworks`.
- Demo seeding: Outside Development, require `DemoData:EnableSeeding=true` and `DemoData:MechanicPassword`; fail fast when `DemoData:MechanicPassword` contains template placeholder markers (for example `CHANGE_ME` or `SET_UNIQUE_LOCAL`, including punctuation-separated variants).
- Configuration files:
  - `appsettings.json` – Production defaults.
  - `appsettings.Local.json` – Local overrides (gitignored).
  - Environment variables override both.
- Health endpoints: `app.MapDefaultEndpoints()` is called in Program.cs; maps `/health` and `/alive` in Development.
- JWT denylist entries are persisted in `revokedjwttokens` and cached in memory for quick revocation checks.
- `TokenDenylistService.IsRevokedAsync` calls `cancellationToken.ThrowIfCancellationRequested()` at entry; `OperationCanceledException` propagates naturally. The JWT bearer `OnTokenValidated` event catches it only at the call site when `RequestAborted` is set — a cancelled request cannot silently treat a revoked JWT as valid.
- `ExpiredTokenCleanupService` (`Security/ExpiredTokenCleanupService.cs`) is a `BackgroundService` registered via `AddHostedService<ExpiredTokenCleanupService>()`. It runs every hour and deletes expired rows from `revokedjwttokens` and expired+revoked rows from `refreshtokens` to prevent unbounded table growth.
- `TemplateMarkerDetector` (`Configuration/TemplateMarkerDetector.cs`) is a shared static helper that detects unconfigured placeholder markers (`CHANGE_ME`, `SET_UNIQUE_LOCAL`, including punctuation-normalized variants). It is used by `JwtSettingsResolver` and `DemoDataInitializer`; do not inline its logic elsewhere.
- Shared TTL constants (`AccessTokenTtl = 10 min`, `RefreshTokenTtl = 7 days`) are declared as `private static readonly TimeSpan` fields in `AuthEndpoints.Helpers.cs`. `BuildAuthCookieOptions(TimeSpan ttl)` is the shared cookie factory; `BuildAccessTokenCookieOptions` and `BuildRefreshTokenCookieOptions` delegate to it.

## EF Core Rules

- Use `options.UseNpgsql(...)` for PostgreSQL.
- Model configuration centralized in `Data/AutoServiceDbContext.cs`.
- Keep schema constraints and indexes aligned with domain invariants.
- `DemoDataInitializer.EnsureSeededAsync()` runs on startup: calls `MigrateAsync()` then seeds mechanics (with Identity accounts), customers (plain records), vehicles, and appointments when tables are empty. Seeding includes 30 additional generated appointments in the current UTC month (including today and multiple same-day entries).
- Seeding includes legacy-state recovery: if migrated/backfilled data exists for customer-side tables but mechanics/identity bootstrap is missing, the initializer resets the inconsistent legacy dataset and reseeds deterministic demo data.