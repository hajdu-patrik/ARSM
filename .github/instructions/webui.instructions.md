---
applyTo: "AutoServiceApp/AutoService.WebUI/**"
description: "Use when editing React frontend, API integration, routing, and UI state in AutoService.WebUI."
---
# AutoService.WebUI Instructions

## Authentication & Authorization

- **Cookie-based authentication**: Users (mechanics only) log in with email/phone + password.
- **Token storage**: Access/refresh tokens are managed by backend HttpOnly cookies (`autoservice_at`, `autoservice_rt`).
- **Token lifespan**: Backend access token lifetime is 10 minutes, refresh token lifetime is 7 days.
- **Login flow**:
  1. User sees Loading page (~3 seconds) only once on first browser load (`localStorage` key: `loading-page-seen`).
  2. If no valid server session exists, redirect to `/login`.
  3. After successful login, redirect to `/` (dashboard).
  4. Axios client sends credentialed requests (`withCredentials`) and retries once through `/api/auth/refresh` after `401` (except auth endpoints).
- **Logout**: Call backend `POST /api/auth/logout`, clear auth store state, then redirect to `/login`.
- **Logout response semantics**: Successful logout returns `204 No Content`; frontend should treat this as success and still clear local auth state in `finally`.
- **Protected routes**: Use `<PrivateRoute>` wrapper to guard dashboard and other authenticated pages.
- **Public-only routes**: Use `<PublicOnlyRoute>` wrapper for login pages so authenticated users are redirected to `/`.
- **Auth store**: Use Zustand (`useAuthStore`) to manage `isAuthenticated`, `user`, `error`, `isLoading`.
- **Auth service**: Use `authService` from `src/services/auth.service.ts` for login/logout/validate-based restore.
- **Identifier parsing** (login UI):
  - emails are trimmed and lowercased before submit,
  - Hungarian phone formats (`+36`, `36`, `06`, local national form without prefix like `301112233`, spaced/punctuated forms) are normalized before submit,
  - invalid identifier format should be rejected client-side with explicit error.

## UI/UX & Theme

- **Dark/Light mode**: Implement with Zustand store (`useThemeStore`). 
  - Shared top-right control toggles theme.
  - Preference saved to `localStorage` as `preferred-theme`.
  - Apply class `dark` to `document.documentElement` when theme is 'dark'.
- **Internationalization (i18n)**:
  - Use `react-i18next` for EN/HU language support.
  - Shared top-right control switches between `en` and `hu`.
  - Control `title` text should follow active language (EN: switch labels in English, HU: switch labels in Hungarian).
  - Preference saved to `localStorage` as `preferred-language`.
  - Add all UI strings to translation resources in `src/utils/i18n.ts`.

## Component Structure

- **`src/pages/Login/page.tsx`**: Login form (email/phone selector, password field, status-based error display).
- **`src/pages/Scheduler/page.tsx`**: Scheduler page — data-fetching orchestrator, stacked layout (summary strip reflects selected day when selected, otherwise today; CalendarView full-width, scheduler intake quick section, MonthAppointmentList below). Manages `selectedAppointment`, `selectedDay`, and selected-day intake modal state; day filter clears on month change. Supports quick intake creation for the selected day, handles unclaim/adminAssign/adminUnassign, passes `isAdmin` and handlers (including update) to AppointmentDetailModal, keeps selected modal content synchronized with latest store snapshot, and performs 8-second background refresh for near-realtime claim/status changes. Uses request-id/current-view refs to avoid stale-closure races and out-of-order background refresh writes.
- **`src/pages/Scheduler/components/PlannerSpace.tsx`**: Legacy today-summary + appointment-card-grid component (currently not rendered by `src/pages/Scheduler/page.tsx`).
- **`src/pages/Scheduler/components/AppointmentCard.tsx`**: Single appointment card with vehicle info, specs, task, mechanic avatars, claim/status controls. Accepts optional `onClick` prop; interactive controls use stopPropagation. Mechanic avatars use deterministic per-mechanic colors and use current-user profile picture when available.
- **`src/pages/Scheduler/components/StatusBadge.tsx`**: Colored status pill for appointment status values (InProgress/Completed/Cancelled; Scheduled no longer emitted by backend).
- **`src/pages/Scheduler/components/CalendarView.tsx`**: Monthly calendar grid (Monday-start, ISO/Hungarian convention), appointment badges, month navigation. On small screens, day cells show max 1 appointment badge; on desktop, day cells show max 3 badges with overflow `+N`. Navigation limited to ±6 months from today (buttons disabled at boundary). Day cells are clickable (`onDayClick` prop); selected day is highlighted (`selectedDay` prop).
- **`src/pages/Scheduler/components/AppointmentDetailModal.tsx`**: Full-detail modal for a selected appointment — vehicle info, license plate, customer name/email, mechanics with specialization and expertise, task description, status controls (claim + status update), and appointment/vehicle edit-save flow. Props: `isAdmin`, `onUnclaim`, `onAdminAssign`, `onAdminUnassign`, `onUpdate`. Regular mechanics see an "Unassign me" button when assigned; admins see a per-mechanic remove (X) button and an "Add mechanic" dropdown populated from the admin mechanic list. Claim button and admin add-mechanic section are hidden for overdue appointments. In edit mode, past appointments keep scheduled datetime fixed as display-only while other editable fields remain editable. Mechanic assignment controls are disabled when the appointment is Cancelled. Uses responsive, overflow-safe layout (`max-h` scroll region, wrapping chips, no overlap) and `Modal` with `max-w-3xl`.
- **`src/pages/Scheduler/components/SchedulerIntakeModal.tsx`**: Selected-day intake modal with auto-derived scheduled datetime (selected day + current send time), due datetime input, email customer lookup, existing/new vehicle modes, and customer-create fallback when lookup misses. Create-customer labels indicate optional middle name and phone.
- **`src/pages/Scheduler/components/due-date.ts`**: Shared due-state helper (`today`/`overdue`/`days left`) used by scheduler cards and detail views.
- **`src/pages/Scheduler/components/MechanicAvatar.tsx`**: Shared mechanic avatar renderer; deterministic color fallback by mechanic ID and mechanic-specific profile picture endpoint (`/api/profile/picture/{personId}`) when available.
- **`src/services/profile-picture-live.service.ts`**: Shared realtime profile-picture update channel using SSE (`/api/profile/picture/updates`) + window event fan-out (`autoservice:profile-picture-updated`) so navbar and scheduler avatars refresh immediately. Reconnect is auth-aware and lifecycle-token guarded, attempts `/api/auth/refresh` on SSE errors, clears auth and stops reconnect attempts on refresh `401/403` (session expiry/auth clear), and teardown clears reconnect timer/event-source handles when the last subscriber unsubscribes.
- **`src/pages/Scheduler/components/MonthAppointmentList.tsx`**: Monthly appointment list rendered as one continuous sorted card grid with per-card date labels. Supports day filtering (`selectedDay` prop) with a "Show all" clear chip, displays loading skeletons while data loads. Filter bar includes status filter chips (toggleable, colored per status), a mechanic dropdown (populated dynamically from appointments), and a date sort toggle (asc/desc); all filters are combinable with each other and with `selectedDay`. Layout rule: mobile is single-column full width, non-mobile is two columns, and if exactly one appointment card is visible it spans full width.
- **`src/pages/Admin/RegisterMechanic/page.tsx`**: Admin-only mechanic management page (mechanic list + registration form).
- **`src/pages/Admin/RegisterMechanic/helpers.ts`**: Registration form helpers for request construction, submit readiness, and field-error lookup.
- **`src/pages/Admin/RegisterMechanic/constants.ts`**: Shared specialization/expertise options and reusable form style class strings.
- **`src/pages/Admin/RegisterMechanic/types.ts`**: Type declarations for register form values, options, and field-error helpers.
- **`src/pages/Admin/RegisterMechanic/sections/BasicInfoSection.tsx`**: Name/email/phone registration inputs (applies shared client-side name/phone filters).
- **`src/pages/Admin/RegisterMechanic/sections/SecuritySection.tsx`**: Password input with show/hide toggle and inline validation messaging.
- **`src/pages/Admin/RegisterMechanic/sections/ProfessionalSection.tsx`**: Specialization dropdown plus expertise multi-select chip list.
- **`src/pages/Admin/RegisterMechanic/sections/MechanicListSection.tsx`**: Mechanic list with left-aligned profile avatar + existing mechanic details and delete button (hidden for admins) + confirmation modal. Reuses `MechanicAvatar` and keeps a responsive row layout. Delete warning text in the modal wraps long email values to prevent overflow. Refreshes after successful registration.
- **`src/pages/Settings/page.tsx`**: Settings page — data-fetching orchestrator, renders ProfilePictureSection + PersonalInfoSection + ChangePasswordSection. Delete profile section hidden for admin users.
- **`src/pages/Settings/sections/ProfilePictureSection.tsx`**: Upload/delete profile picture with avatar preview (crop modal opens before upload).
- **`src/pages/Settings/sections/PersonalInfoSection.tsx`**: Update first name, middle name, last name, email, and phone (all fields are editable).
- **`src/pages/Settings/sections/ChangePasswordSection.tsx`**: Change password with current/new/confirm fields and show/hide toggle. Settings page validates `newPassword.length < 8` client-side before submit (matching admin registration behavior).
- **`src/pages/Tools/page.tsx`**: Tools management skeleton page (coming soon, uses `tools.*` i18n keys).
- **`src/pages/Inventory/page.tsx`**: Inventory management skeleton page (coming soon, uses `inventory.*` i18n keys).
- **`src/pages/LoadingPage.tsx`**: Initial loading animation (~3 seconds, shows only once per browser profile).
- **`src/pages/NotFound.tsx`**: 404 error page (catches all undefined routes).
- **`src/components/layout/SidebarLayout.tsx`**: Collapsible sidebar layout with fixed-width icon column for consistent alignment, smooth cubic-bezier width transitions, mobile drawer with overlay close, desktop collapse/expand without icon resizing. Collapse preference is persisted in `localStorage` under `preferred-sidebar-collapsed`; default main nav order starts with Scheduler.
- Sidebar profile area should immediately reflect profile-picture upload/remove changes; fallback avatar uses name-based initials with a deterministic color picked from a fixed 10-color palette; avatar snapshot state resets on auth teardown to avoid previous-user leakage.
- **Icons**: Use `lucide-react` for UI icons (navigation, actions, status cues). Avoid inline SVG icon markup in shared UI components.
- **`src/components/seo/SeoManager.tsx`**: Route-aware SEO manager — keeps `document.title` fixed to `ARSM` while updating route-specific meta description, robots, Open Graph, Twitter Card, canonical URL, and `html lang`.
- **`src/components/common/FormErrorMessage.tsx`**: Inline form validation error display (i18n-aware, accepts message key + className).
- **`src/components/common/ToastViewport.tsx`**: App-wide toast viewport (5-second auto-dismiss, green success, red error).
- **`src/components/common/Modal.tsx`**: Shared dialog shell for confirmation/crop flows.
- **`src/components/common/ProfilePictureCropModal.tsx`**: Crop-and-upload flow before profile picture submission.
- **`src/components/layout/ThemeLanguageControls.tsx`**: EN/HU + dark/light controls (accepts `className` prop for repositioning).
- **`src/router/PrivateRoute.tsx`**: Route guard that redirects to `/login` if not authenticated.
- **`src/router/PublicOnlyRoute.tsx`**: Route guard that redirects authenticated users to `/`.

## Services & State

- **`src/services/auth.service.ts`**: Login, logout, and auth-state restore via `/api/auth/validate`.
- **`src/services/admin.service.ts`**: registerMechanic/list/delete for admin flows; `GET /api/admin/mechanics` payload includes `hasProfilePicture` for avatar rendering.
- **`src/services/appointment.service.ts`**: findCustomerByEmail via `GET /api/customers/by-email`; createIntake via `POST /api/appointments/intake`; updateAppointment via `PUT /api/appointments/{id}` (appointment fields only; legacy vehicle fields are ignored server-side); getByMonth, getToday, claim, unclaim, updateStatus, adminAssign, adminUnassign via `/api/appointments`.
- **`src/services/profile.service.ts`**: getProfile, updateProfile, changePassword, uploadProfilePicture, deleteProfilePicture, deleteProfile via `/api/profile`.
- Profile picture upload must send multipart `FormData`; axios request interceptor should clear inherited JSON content-type for FormData payloads so browser boundary headers are applied.
- **`src/store/auth.store.ts`**: Zustand store for `user`, `isAuthenticated`, `isLoading`, `error`.
- **`src/store/theme.store.ts`**: Zustand store for dark/light mode preference.
- **`src/store/scheduler.store.ts`**: Zustand store for `todayAppointments`, `monthAppointments`, `calendarYear`, `calendarMonth`, loading states, `upsertAppointment` for optimistic sync after claim/status/intake mutations (including immediate today/month insertion when scheduled date matches current views).
- **`src/store/toast.store.ts`**: Zustand store for global toasts (message key + interpolation values, duration, remove actions).
- **`src/services/api.client.ts`**: Axios instance with credentialed cookie requests and refresh retry; requires `VITE_API_URL` from environment (no hardcoded URL fallback).
- **`src/types/login.types.ts`**: TypeScript interfaces for auth API contracts (LoginRequest, LoginResponse, AuthUser, ValidateTokenResponse, RefreshResponse, JwtPayload).
- **`src/types/scheduler.types.ts`**: TypeScript interfaces for scheduler (`AppointmentDto` includes `intakeCreatedAt`, `dueDateTime`, `completedAt?`, `canceledAt?`, plus `VehicleDto`, `CustomerSummaryDto`, `MechanicSummaryDto`; `AppointmentStatus` is `'InProgress' | 'Completed' | 'Cancelled'`; includes `CalendarDay`, `UpdateStatusRequest`, `UpdateAppointmentRequest`, `SchedulerCustomerLookupDto`, `SchedulerVehicleLookupDto`, `SchedulerNewVehicleRequest`, `SchedulerCreateIntakeRequest`).
- **`src/types/profile.types.ts`**: TypeScript interfaces for profile (`ProfileData`, `UpdateProfileRequest` (firstName?, lastName?, email?, phoneNumber?, middleName?), `ChangePasswordRequest`, `DeleteProfileRequest`).
- **`src/utils/avatar.ts`**: Deterministic fallback avatar utilities.
- **`src/utils/imageCrop.ts`**: Canvas crop helper for profile image workflow.
- **`src/utils/validation.ts`**: Shared input validation — `filterNameInput` (Unicode letters and hyphens only; spaces and apostrophes stripped), `filterPhoneInput` (digits/phone-special-chars only), `isAllowedPictureExtension` (.png/.jpg/.jpeg/.webp).
- **`src/utils/serverValidation.ts`**: Shared backend-validation helpers — `mapValidationMessageToKey(message, context)` central mapping function (email/phone uniqueness, invalid email/phone, invalid name, password errors); `mapAdminValidationMessageToKey` and `mapSettingsValidationMessageToKey` delegate to it; also provides `getServerFieldError`, `extractServerFieldErrors`, `normalizeServerFieldErrors`.
- **`src/utils/i18n.ts`**: i18next configuration; translations split into `src/utils/locales/en.ts` and `src/utils/locales/hu.ts` (keys: login, layout, nav, sidebar, theme, modal, toast, scheduler, admin, settings, tools, inventory, notFound). Scheduler sub-keys include `scheduler.monthList.*` (title, count, empty, emptyFiltered, clearFilter), `scheduler.filter.*` (allMechanics, sortAsc, sortDesc), and `scheduler.detail.*` (title, scheduledDate, vehicle, licensePlate, task, customer, customerName, customerEmail, mechanics, specialization, expertise, noMechanics, unassignMe, removeMechanic, addMechanic, selectMechanic, assignError, unassignError, unassignCancelledError, adminUnassignError). EN and HU locale files define scheduler keys explicitly.
- **`src/components/common/Image.tsx`**: Reusable image wrapper component.
- **`vite.config.ts`**: In serve mode, dev server runs over HTTPS (`vite-plugin-mkcert`) on port from `PORT` env var (`strictPort: true`).

## Routing

- `/login` → Login page (public-only; wrapped in `PublicOnlyRoute`).
- `/` → Scheduler page (protected, requires valid auth session).
- `/scheduler` → redirect alias to `/`.
- `/dashboard` → redirect alias to `/`.
- `/admin/register` → RegisterMechanicPage (admin-only, rendered inside SidebarLayout).
- `/tools` → ToolsPage (protected, skeleton with coming-soon content).
- `/inventory` → InventoryPage (protected, skeleton with coming-soon content).
- `/settings` → Settings page (protected) — profile picture crop/upload/remove, personal info, password change, profile deletion.
- `/*` → 404 Not Found page.
- All protected routes render inside `<SidebarLayout>`.
- BrowserRouter should keep `future` flags enabled (`v7_startTransition`, `v7_relativeSplatPath`) to avoid React Router v7 deprecation warnings.

## API Integration

- **Auth endpoints**:
  - `POST /api/auth/login` – (email or phoneNumber) + password → cookie session + profile.
  - `POST /api/auth/refresh` – refresh token rotation + access cookie reissue (server rate-limited by `AuthRefreshAttempts`).
  - `POST /api/auth/logout` – refresh revoke + cookie clear; returns `204 No Content` on success.
  - `GET /api/auth/validate` – validate active authenticated session.
  - `POST /api/auth/login` failure semantics: generic `401 invalid_credentials`, `403 mechanic_only_login` for existing customer email/phone identifiers, `429` lockout/rate-limit, `500` linked domain-record issues.
- **Appointment endpoints**:
  - `GET /api/appointments?year=&month=` – list appointments for a month (authorized).
  - `GET /api/appointments/today` – list today's appointments (authorized).
  - `POST /api/appointments/intake` – create intake appointment from scheduler flow (authorized); scheduler auto-derives scheduled datetime and submits due datetime input.
  - `PUT /api/appointments/{id}` – update appointment fields from detail-modal edit flow (authorized; customer/vehicle fields are unchanged by this endpoint; scheduledDate past-date rules are enforced).
  - `PUT /api/appointments/{id}/claim` – mechanic self-assigns to an appointment (authorized).
  - `DELETE /api/appointments/{id}/claim` – mechanic self-unassigns from an appointment (authorized).
  - `PUT /api/appointments/{id}/status` – update appointment status (authorized, assigned mechanic only).
  - `PUT /api/appointments/{id}/assign/{mechanicId}` – admin assigns a mechanic (authorized, admin-only).
  - `DELETE /api/appointments/{id}/assign/{mechanicId}` – admin removes a mechanic (authorized, admin-only).
  - `GET /api/customers/by-email` – lookup customer by email for scheduler intake flow (authorized).
- **Profile endpoints**:
  - `GET /api/profile` – get current user profile data (authorized).
  - `PUT /api/profile` – update email, phone, first name, middle name, last name (authorized).
  - `POST /api/profile/change-password` – change password (authorized).
  - `DELETE /api/profile` – delete current user profile after current-password confirmation (authorized, returns 403 for admin users).
  - `GET /api/profile/picture` – get profile picture (authorized).
  - `GET /api/profile/picture/{personId}` – get a mechanic profile picture by person id (authorized, scheduler avatars).
  - `GET /api/profile/picture/updates` – SSE stream for realtime profile picture update events (authorized).
  - `PUT /api/profile/picture` – upload profile picture, multipart/form-data (authorized).
  - `DELETE /api/profile/picture` – delete profile picture (authorized).
- **Admin endpoints**:
  - `GET /api/admin/mechanics` – list all mechanics with admin flag and `hasProfilePicture` (authorized, admin-only).
  - `DELETE /api/admin/mechanics/{id}` – delete a mechanic (authorized, admin-only, returns 403 for admin targets or self-deletion; returns 422 if deleting would leave zero mechanics globally or leave an appointment with zero assigned mechanics; returns 409 on concurrent contention/serialization conflict).
- **VITE_API_URL**: AppHost injects the API base URL as an environment variable.
- **No URL hardcode fallback**: `VITE_API_URL` must come from env (AppHost or `.env.development`).
- **Error handling**: Axios interceptor handles refresh-on-401 flow and login page maps `401/403/429/500` and network/database availability failures to dedicated EN/HU messages.
- **Global toast handling**: Use message keys in toast state (not translated strings) so visible toasts update instantly on language/theme change.

## Input Validation (Client-Side)

- Name fields (first, middle, last) filter input to Unicode letters and hyphens only — spaces and apostrophes are stripped (via `filterNameInput` from `src/utils/validation.ts`). Applied in both admin registration (`BasicInfoSection`) and settings (`PersonalInfoSection`).
- Phone number fields filter input to digits and phone special characters (`+`, `-`, `(`, `)`, space) only (via `filterPhoneInput`). Applied in both admin registration and settings.
- Profile picture upload validates file extension against `.png`, `.jpg`, `.jpeg`, `.webp` before processing (via `isAllowedPictureExtension`). Invalid types show error toast (`toast.pictureInvalidType`).

## Styling & Responsive Design

- Use React function components with strict TypeScript.
- Keep API calling logic in `src/services` and keep components focused on UI/state.
- Keep styles in Tailwind utility classes; avoid unnecessary custom CSS.
- Keep global typography default as `Inter` from `src/index.css`; avoid resetting components back to system fonts.
- Global CSS in `src/index.css` includes a `select:focus` rule applying a purple ring consistent with the project theme; scheduler select elements use `focus:outline-none` to defer to this rule.
- Keep layouts responsive for desktop and mobile.
- Use pastel purple as the primary accent color (`bg-purple-500`, `text-purple-600`).
- Form validation messages should be explicit and user-friendly.
- Login form inputs should include proper `autocomplete` attributes (for example password uses `current-password`).
- Both dark and light modes must be visually appealing.

## Key Dependencies

- `react-router-dom` – Client-side routing.
- `axios` – HTTP client (credentialed requests + refresh retry).
- `zustand` – State management (auth, theme).
- `react-easy-crop` – Profile picture crop interaction.
- `i18next` + `react-i18next` – Internationalization.
- `tailwindcss` – Styling (with dark mode support via `darkMode: 'class'`).
- `jwt-decode` – JWT payload decoding.

## Security Notes

- Never log tokens/cookies or sensitive user data to console.
- Keep auth trust server-side via `/api/auth/validate` and backend cookie/session controls.
- Only mechanics can log in; customers are managed server-side.
- Use HTTPS in production.

