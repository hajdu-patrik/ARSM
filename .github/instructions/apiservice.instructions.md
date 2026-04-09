---
applyTo: "AutoServiceApp/AutoService.ApiService/**"
description: "Use when editing backend API, auth, EF Core model, migrations, and domain logic in AutoService.ApiService."
---
# AutoService.ApiService Instructions

## Domain Model & Persistence

- Preserve People inheritance as TPH with one people table and discriminator.
- Keep People abstract, with Customer and Mechanic as derived entities.
- Keep Identity linkage through People.IdentityUserId only.
- Keep FullName as owned value object mapping.
- Keep mechanic expertise constraints intact: 1..10 items, unique, non-empty persisted value.
- Keep core relationships:
  - `Customer` 1..* `Vehicle`,
  - `Vehicle` 1..* `Appointment`,
  - `Appointment` *..* `Mechanic` (join table).
- `ProgresStatus` enum values: `InProgress`, `Completed`, `Cancelled`. Default on new appointments is `InProgress` (there is no `Scheduled` value).
- `Appointment` entity has `DateTime? CompletedAt` and `DateTime? CanceledAt`; status transitions auto-set/clear these timestamps.
- `AppointmentDto` includes `CompletedAt` and `CanceledAt` fields.
- Use DTO contracts at API boundaries, do not expose EF entities directly.
- Prefer async EF methods and cancellation tokens.
- Place new migrations in Data/Migrations.

## Authentication & Security

- Keep auth mechanic-only for registration and login.
- Keep auth registration transactional: IdentityUser + Mechanic domain record in one transaction.
- Keep auth endpoints in Auth folder and avoid expanding Program.cs with endpoint handler logic.
- Prefer splitting large auth endpoint files into focused files in `Auth/` (for example map/register/login/helpers/contracts).
- Keep JWT signing secret externalized (env or local untracked config), minimum 32 bytes.
- Keep login protections: lockout (5 failed attempts, 15 min lockout), rate limit (10 req/min), and temporary ban behavior (3 min) consistent unless explicitly requested.
- Keep auth input normalization consistent across register/login:
  - emails are trimmed + lowercased,
  - Hungarian phone formats (`+36`, `36`, `06`, local national form without prefix like `301112233`, spaced/punctuated forms) normalize to canonical national form with strict prefix/length rules:
    - `361xxxxxxx` (Budapest),
    - `36(20|21|30|31|50|70)xxxxxxx` (mobile/nomadic),
    - `36<approved 2-digit area>xxxxxx` (geographic).
- Keep contact normalization, name validation, token-security helpers, and shared validation error message constants centralized in `Common/` (`ContactNormalization`, `TokenSecurity`, `ValidationMessages`) and reuse them from endpoint files.
- Name fields (first name, middle name, last name) must be validated with `ContactNormalization.IsValidName()` (pattern `^[\p{L}\-]+$`) at registration, profile update, and customer create/update. Use `ValidationMessages` constants for error messages.
- Registration must reject duplicate phone numbers even when equivalent values are provided in different formats.
- JWT token lifetime is 10 minutes.
- JWT validation: issuer/audience validation enabled, lifetime validation enabled, clock skew 1 minute.
- Keep cookie auth secure defaults for auth cookies (HttpOnly, Secure, SameSite, explicit Path).
- CORS policy must allow explicit WebUI origins with credentials; configure via `Cors:AllowedOrigins`, `builder.Services.AddCors()`, and `app.UseCors()`.

## API Endpoints (Current)

- `POST /api/auth/register` – Mechanic-only registration; returns IdentityUserId + PersonId + PersonType + Email.
- `POST /api/auth/login` – Email or phone + password → sets access + refresh cookies and returns profile info + expiration time.
- `POST /api/auth/refresh` – Rotates refresh token and reissues access cookie.
- `POST /api/auth/logout` – Revokes refresh token session, denylists current JWT `jti`, clears auth cookies.
- `GET /api/auth/validate` – Returns person linkage data for valid authenticated session.
- `POST /api/auth/login` accepts normalized email/phone identifier input and supports backward-compatible phone-in-email field fallback.
- `POST /api/auth/login` failure semantics: generic `401 invalid_credentials` for unknown/wrong credentials, `403 mechanic_only_login` when an existing customer email/phone is used, `429` for lockout/rate-limit, `500` when linked domain record is missing.

### Profile Endpoints (`/api/profile`) — all require authorization

- `GET /api/profile` — Get current user's profile data (name, email, phone, picture status).
- `PUT /api/profile` — Update email, phone number, first name, middle name, last name. Email/phone normalized and uniqueness-checked; first/last name cannot be set to empty.
- `DELETE /api/profile` — Delete current user's profile after validating current password. Returns 403 if caller is admin. Clears auth cookies and invalidates active session.
- `POST /api/profile/change-password` — Change password (CurrentPassword + NewPassword + ConfirmNewPassword). Uses Identity `ChangePasswordAsync`.
- `GET /api/profile/picture` — Serve profile picture binary with content type header.
- `GET /api/profile/picture/{personId}` — Serve mechanic profile picture binary by mechanic person id (authorized; 404 if mechanic/picture missing).
- `GET /api/profile/picture/updates` — Server-Sent Events stream for profile-picture updates (`profile-picture-updated` events with personId/hasProfilePicture/cacheBuster payload).
- `PUT /api/profile/picture` — Upload profile picture (multipart/form-data, file bound from form payload). Max 512 KB, JPEG/PNG/WebP only.
- `DELETE /api/profile/picture` — Remove profile picture.
- Group root endpoints are mapped without requiring a trailing slash (for example, `/api/profile` works directly).
- Profile DTOs: `ProfileResponse`, `UpdateProfileRequest` (Email?, PhoneNumber?, FirstName?, MiddleName?, LastName?), `ChangePasswordRequest`, `DeleteProfileRequest`.
- Endpoint files follow partial-class pattern in `Profile/` folder (mirroring `Appointments/` structure: contracts/helpers/queries/mutations/profilepicture).

### Admin Endpoints (`/api/admin`) — all require AdminOnly authorization

- `GET /api/admin/mechanics` — List all mechanics with admin flag.
- `DELETE /api/admin/mechanics/{id}` — Delete a mechanic (revokes refresh tokens, removes identity + domain record). Returns 403 if target is admin or caller is deleting themselves, and 422 if deleting would leave zero mechanics globally or would leave any appointment without assigned mechanics.
- Endpoint files follow partial-class pattern in `Admin/` folder (contracts/handlers).

### Customer Endpoints (`/api/customers`) — all require authorization; write operations require AdminOnly

- `GET /api/customers` — List all customers (id, name, email, phone, vehicleCount).
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
- `POST /api/customers/{customerId}/appointments` (AdminOnly) — Create an appointment for a customer's vehicle. Validates positive `vehicleId`, non-empty `taskDescription` (max 200), unique positive `mechanicIds`, required `scheduledDate`, customer/vehicle existence and ownership, and mechanic IDs. Returns 201 Created.
- `PUT /api/appointments/{id}/claim` — Current mechanic (from JWT `person_id`) self-assigns to an appointment. Returns 409 if already claimed, 422 if appointment is Cancelled.
- `DELETE /api/appointments/{id}/claim` — Current mechanic (from JWT `person_id`) self-unassigns from an appointment. Returns 409 if not assigned, 422 if appointment is Cancelled or if unassign would leave the appointment without assigned mechanics.
- `PUT /api/appointments/{id}/status` — Update appointment status (requesting mechanic must be assigned). Validates status enum (`InProgress`, `Completed`, `Cancelled`), returns 403 if not assigned. Auto-sets `CompletedAt` when transitioning to Completed, `CanceledAt` when transitioning to Cancelled; clears both when transitioning back to InProgress. Cancelled appointments can be moved back to `InProgress` or `Completed`, including for past-dated appointments.
- `PUT /api/appointments/{id}/assign/{mechanicId}` (AdminOnly) — Admin assigns any mechanic to an appointment. Returns 404 if mechanic/appointment not found, 409 if already assigned, 422 if appointment is Cancelled.
- `DELETE /api/appointments/{id}/assign/{mechanicId}` (AdminOnly) — Admin removes any mechanic from an appointment. Returns 404 if appointment not found, 409 if not assigned, 422 if appointment is Cancelled or if removal would leave the appointment without assigned mechanics.
- Group root endpoints are mapped without requiring a trailing slash (for example, `/api/appointments` works directly).
- Appointment DTOs: `AppointmentDto`, `VehicleDto`, `CustomerSummaryDto`, `MechanicSummaryDto`, `UpdateStatusRequest`.
- Endpoint files follow partial-class pattern in `Appointments/` folder (mirroring `Auth/` structure).

## API Documentation

- OpenAPI spec: `GET /openapi/v1.json` (Development only, via `Microsoft.AspNetCore.OpenApi`).
- Interactive docs: Scalar API Reference at `/scalar/v1` (Development only, via `Scalar.AspNetCore`).

## Configuration

- Database: PostgreSQL via Aspire (NpgsqlEntityFrameworkCore.PostgreSQL provider).
- Connection string key: `ConnectionStrings:AutoServiceDb`.
- JWT settings: `JwtSettings:Secret` (min 32 bytes), `JwtSettings:Issuer`, `JwtSettings:Audience`.
- CORS settings: `Cors:AllowedOrigins` (required explicit origins for credentialed cross-origin requests).
- Demo seeding: Outside Development, require `DemoData:EnableSeeding=true` and `DemoData:MechanicPassword`.
- Configuration files:
  - `appsettings.json` – Production defaults.
  - `appsettings.Local.json` – Local overrides (gitignored).
  - Environment variables override both.
- Health endpoints: `app.MapDefaultEndpoints()` is called in Program.cs; maps `/health` and `/alive` in Development.

## EF Core Rules

- Use `options.UseNpgsql(...)` for PostgreSQL.
- Model configuration centralized in `Data/AutoServiceDbContext.cs`.
- Keep schema constraints and indexes aligned with domain invariants.
- `DemoDataInitializer.EnsureSeededAsync()` runs on startup: calls `MigrateAsync()` then seeds mechanics (with Identity accounts), customers (plain records), vehicles, and appointments when tables are empty. Seeding includes 30 additional generated appointments in the current UTC month (including today and multiple same-day entries).