---
applyTo: "app/AutoService.WebUI/**"
description: "Use when editing React frontend, API integration, routing, and UI state in AutoService.WebUI."
---
# AutoService.WebUI Instructions

## Code Documentation Style

- For new or changed non-trivial classes/methods, use JSDoc-style block comments.
- Do not use XML documentation comments (`/// <summary>`, `/// <param>`, `/// <returns>`).
- When code changes introduce/modify classes or methods, use the `coding-principles` agent.

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
- **Admin-only routes**: Use `<AdminRoute>` wrapper for admin pages so non-admin authenticated users are redirected to `/`.
- **Auth store**: Use Zustand (`useAuthStore`) to manage `isAuthenticated`, `user`, `error`, `isLoading`.
- **Auth service**: Use `authService` from `src/services/auth/auth.service.ts` for login/logout/validate-based restore.
- **Identifier parsing** (login UI):
  - emails are trimmed and lowercased before submit,
  - phone inputs are normalized to canonical E.164 before submit,
  - accepted phone numbers must be valid European numbers using the same country-allowlist policy as the backend,
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
  - Add all UI strings to both locale files: `src/utils/locales/en.ts` and `src/utils/locales/hu.ts`.

## Component Structure

- **`src/pages/Login/page.tsx`**: Login form (email/phone selector, password field, status-based error display, and dedicated inline system-error panel for `login.serverError500` / `login.databaseUnavailable`).
- **`src/pages/Scheduler/page.tsx`**: Scheduler page — layout orchestrator, stacked layout (summary strip reflects selected day when selected, otherwise today; CalendarView full-width, scheduler intake quick section, MonthAppointmentList below). Manages `selectedAppointment`, `selectedDay`, and selected-day intake modal state; day filter clears on month change. Supports quick intake creation for the selected day, handles unclaim/adminAssign/adminUnassign, passes `isAdmin` and handlers (including update) to AppointmentDetailModal, keeps selected modal content synchronized with latest store snapshot. Calendar view + selected day persistence is session-only via `sessionStorage` key `scheduler-selected-view`. The scheduler wrapper intentionally does not own `h-full`/`overflow-auto` so vertical scrolling remains owned by the shared sidebar shell. Data-fetching and background refresh are delegated to `useSchedulerDataSync`.
- **`src/pages/Scheduler/hooks/useSchedulerDataSync.ts`**: Extracted data-fetching and background-refresh hook; fetches today's appointments on mount, fetches the selected month on calendar changes, runs 8-second background poll for near-realtime claim/status updates, and triggers immediate refresh on profile-picture SSE events. Uses request-id and current-view refs to prevent stale-closure races and out-of-order writes. Distinguishes auth-expired (`401/403`) versus generic load failures via dedicated i18n toast keys.
- **`src/pages/Scheduler/components/shared/AppointmentCard.tsx`**: Single appointment card with vehicle info, specs, task, mechanic avatars, and claim controls. Accepts optional `onClick` prop; interactive controls use stopPropagation. Mechanic avatars use deterministic per-mechanic colors and use current-user profile picture when available. Claim CTA is rendered in a centered row with a full-width button.
- **`src/pages/Scheduler/components/shared/StatusBadge.tsx`**: Colored status pill for appointment status values (InProgress/Completed/Cancelled; Scheduled no longer emitted by backend).
- **`src/pages/Scheduler/components/calendar/CalendarView.tsx`**: Monthly calendar grid (Monday-start, Hungarian week convention), appointment badges, month navigation. Calendar widget content is non-selectable (`select-none`). On small screens, day cells show max 1 appointment badge and mobile week rows enforce a uniform taller minimum height whenever any day in that week has appointments; overflow `+N` is rendered consistently above the mobile appointment dot indicator. Day-number row and indicator block use fixed minimum heights to keep mobile row baselines aligned week-to-week. On desktop, day cells show max 3 badges with overflow `+N`. Navigation limited to ±6 months from today (buttons disabled at boundary). Day cells are clickable (`onDayClick` prop); selected day is highlighted (`selectedDay` prop).
- **`src/pages/Scheduler/components/detail/AppointmentDetailModal.tsx`**: Container/orchestrator for the selected-appointment detail modal (state, callbacks, modal composition). Props: `isAdmin`, `onUnclaim`, `onAdminAssign`, `onAdminUnassign`, `onUpdate`. Behavior remains unchanged: regular mechanics see an "Unassign me" button only when they are assigned and the appointment has more than one assigned mechanic; admins see a per-mechanic remove (X) button only while more than one mechanic remains and an "Add mechanic" dropdown populated from the admin mechanic list; admin remove is guarded by confirmation modal. Claim button is hidden for overdue appointments. Status change in the footer is assigned-only (no admin override unless the admin is also assigned). In edit mode, mechanics/claim/admin controls are hidden, and the assigned/claimed-appointment status dropdown is hidden until edit mode is exited; scheduled datetime stays display-only while due datetime and task description remain editable; update payload includes due/task plus compatibility vehicle fields (`dueDateTime`, `taskDescription`, `licensePlate`, `brand`, `model`, `year`, `mileageKm`, `enginePowerHp`, `engineTorqueNm`). Mechanic mutation controls are disabled when the appointment is `Cancelled` or `Completed`.
- **`src/pages/Scheduler/components/detail/AppointmentDetailModal.sections.tsx`**: Extracted modal body/presentational sections (`AppointmentDetailBody`) for import-boundary stabilization; uses `inputClassCompact` from `src/utils/formStyles.ts` for compact input fields in the detail view. Mechanic assign select has `aria-label` from `scheduler.detail.selectMechanic` i18n key, and the self-unassign control is hidden when unassigning would leave zero mechanics.
- **`src/pages/Scheduler/components/detail/AppointmentDetailModal.footer.tsx`**: Extracted modal footer/status-action section (`AppointmentDetailFooter`) for import-boundary stabilization. Status change select has `aria-label` from `scheduler.changeStatus` i18n key. Claim CTA is rendered in a full-width centered row in the footer.
- **`src/pages/Scheduler/components/detail/AppointmentDetailModal.view.tsx`**: Compatibility barrel that re-exports modal presentational pieces (`AppointmentDetailBody`, `AppointmentDetailFooter`).
- **`src/pages/Scheduler/components/detail/AppointmentDetailModal.edit.ts`**: Extracted edit-form model/builders/validation (`EditFormState`, `buildEditForm`, `buildUpdateRequestFromEditForm`, numeric normalization helpers).
- **`src/pages/Scheduler/components/detail/AppointmentDetailRemoveMechanicModal.tsx`**: Extracted admin remove-mechanic confirmation modal (receives `pendingRemoveMechanic`, `removingMechanicId`, `isCancelled`; delegates confirm/close callbacks).
- **`src/pages/Scheduler/hooks/useAdminMechanics.ts`**: Extracted admin mechanic-list hook for modal assign/remove flows (refreshes on profile-picture update events); silent catch block logs errors in development only via `import.meta.env.DEV`.
- **`src/pages/Scheduler/hooks/useSchedulerActions.ts`**: Extracted scheduler mutation callbacks hook; provides stable, memoized handlers for claim, unclaim, status change, admin assign/unassign, intake creation, and appointment update with optimistic store upserts and success/error toasts.
- **`src/pages/Scheduler/hooks/useSchedulerSummary.ts`**: Extracted summary-strip data computation hook; derives selected date object, formatted label, past-day check, display text, and appointment count for the selected day or today.
- **`src/pages/Scheduler/components/summary/SchedulerSummaryStrip.tsx`**: Summary strip component displayed at the top of the scheduler page; shows the context date label and appointment count for the selected day or today.
- **`src/pages/Scheduler/components/summary/SchedulerQuickIntakeSection.tsx`**: Quick intake action section; displays selected day label and button to open intake modal (button disabled when no day is selected).
- **`src/pages/Scheduler/components/intake/SchedulerIntakeModal.tsx`**: Selected-day intake modal container/orchestrator that wires shared intake sections and form hook; auto-derived scheduled datetime (selected day + current send time), due datetime input, email customer lookup, existing/new vehicle modes, and customer-create fallback when lookup misses (including backend mechanic-email owner-link resolution path). In the not-found flow, submission can proceed without manual customer first/last names so backend can resolve/create the linked customer for mechanic-email intake; if either first/last name is entered manually, both are required.
- **`src/pages/Scheduler/components/intake/SchedulerIntakeModal.helpers.ts`**: Extracted intake helper utilities (request building, error parsing, vehicle numeric clamping).
- **`src/pages/Scheduler/components/intake/SchedulerIntakeModal.types.ts`**: Extracted intake type definitions (`LookupState`, `VehicleMode`, `IntakeApiError`, `VehicleFormState`, `SchedulerIntakeFormState`, `VEHICLE_NUMERIC_LIMITS`).
- **`src/pages/Scheduler/components/intake/SchedulerIntakeSections.tsx`**: Extracted intake UI sections with unified form-field styling and explicit placeholders across customer/vehicle/task inputs. Intake sections keep grouped user/vehicle/task titles; existing-vehicle dropdown keeps its placeholder option disabled (non-selectable); create-customer labels indicate optional middle name and phone.
- **`src/pages/Scheduler/hooks/useSchedulerIntakeForm.ts`**: Extracted intake form-state/lookup hook. Editing the lookup email resets lookup-dependent UI state (vehicle mode selection, selected existing vehicle, task section), and lookup failures also clear stale lookup-derived sections before surfacing the error.
- **`src/pages/Scheduler/components/intake/SchedulerIntakeModal.tsx`** + `useSchedulerIntakeForm` + `SchedulerIntakeSections`: Vehicle numeric inputs clamp to documented max ranges client-side and map backend numeric validation errors.
- **`src/pages/Scheduler/utils/due-date.ts`**: Shared due-state helper (`today`/`overdue`/`days left`) used by scheduler cards and detail views; also exports `buildSelectedDayIso` and `toDatetimeLocalValue` helpers used by intake.
- **`src/pages/Scheduler/components/shared/MechanicAvatar.tsx`**: Shared mechanic avatar renderer; deterministic color fallback by mechanic ID and mechanic-specific profile picture endpoint (`/api/profile/picture/{personId}`) when available.
- **`src/services/profile/profile-picture-live.service.ts`**: Shared realtime profile-picture update channel using SSE (`/api/profile/picture/updates`) + window event fan-out (`autoservice:profile-picture-updated`) so navbar and scheduler avatars refresh immediately. Reconnect is auth-aware and lifecycle-token guarded, attempts `/api/auth/refresh` on SSE errors, clears auth and stops reconnect attempts on refresh `401/403` (session expiry/auth clear), and teardown clears reconnect timer/event-source handles when the last subscriber unsubscribes.
- **`src/pages/Scheduler/components/calendar/MonthAppointmentList.tsx`**: Monthly appointment list rendered as one continuous sorted card grid. Supports day filtering (`selectedDay` prop) with a "Show all" clear chip, displays loading skeletons while data loads. Header badge count always displays the full month total (`appointments.length`) regardless of selected day or active filters. Filter bar includes status filter chips (toggleable, colored per status), a mechanic dropdown (populated dynamically from appointments) with `aria-label` from `scheduler.filter.allMechanics` i18n key, and a date sort toggle (asc/desc); all filters are combinable with each other and with `selectedDay`. Layout rule: mobile is single-column full width, non-mobile is two columns, and if exactly one appointment card is visible it spans full width.
- **`src/pages/Scheduler/utils/scheduler-datetime.ts`**: Shared scheduler date/time formatting and calendar-day comparison helpers used by scheduler components and hooks.
- **`src/pages/Admin/RegisterMechanic/page.tsx`**: Admin-only mechanic management page (mechanic list + registration form).
- **`src/pages/Admin/RegisterMechanic/helpers.ts`**: Registration form helpers for request construction, submit readiness, and field-error lookup.
- **`src/pages/Admin/RegisterMechanic/constants.ts`**: Shared specialization/expertise options; re-exports `inputClass`, `labelClass` from `src/utils/formStyles.ts`.
- **`src/pages/Admin/RegisterMechanic/types.ts`**: Type declarations for register form values, options, and field-error helpers.
- **`src/pages/Admin/RegisterMechanic/sections/BasicInfoSection.tsx`**: Name/email/phone registration inputs (applies shared client-side name/phone filters); sets `aria-invalid` on fields when validation errors are present.
- **`src/pages/Admin/RegisterMechanic/sections/SecuritySection.tsx`**: Password input with show/hide toggle and inline validation messaging.
- **`src/pages/Admin/RegisterMechanic/sections/ProfessionalSection.tsx`**: Specialization dropdown plus expertise multi-select chip list.
- **`src/pages/Admin/RegisterMechanic/sections/MechanicListSection.tsx`**: Mechanic list with left-aligned profile avatar + existing mechanic details and delete button (hidden for admins) + confirmation modal. Reuses `MechanicAvatar` and keeps a responsive row layout. Delete warning text in the modal wraps long email values to prevent overflow. Refreshes after successful registration.
- **`src/pages/Settings/page.tsx`**: Settings page — data-fetching orchestrator, renders ProfilePictureSection + PersonalInfoSection + ChangePasswordSection. Delete profile section hidden for admin users.
- **`src/pages/Settings/types.ts`**: Shared settings page type aliases (`FieldErrors`, `GetFieldError`).
- **`src/pages/Settings/constants.ts`**: Settings form-style re-exports (re-exports `inputClass`, `readonlyInputClass`, `labelClass`, `cardClass`, `buttonClass` from `src/utils/formStyles.ts`).
- **`src/pages/Settings/helpers.ts`**: Settings page helper functions for server validation integration (`getFieldError`, `extractFieldErrors`).
- **`src/pages/Settings/sections/ProfilePictureSection.tsx`**: Upload/delete profile picture with avatar preview (crop modal opens before upload).
- **`src/pages/Settings/sections/PersonalInfoSection.tsx`**: Update first name, middle name, last name, email, and phone (all fields are editable); sets `aria-invalid` on fields when validation errors are present.
- **`src/pages/Settings/sections/ChangePasswordSection.tsx`**: Change password with current/new/confirm fields and show/hide toggle. Settings page validates `newPassword.length < 8` client-side before submit (matching admin registration behavior); sets `aria-invalid` on fields when validation errors are present.
- **`src/pages/Tools/page.tsx`**: Tools management skeleton page (coming soon, uses `tools.*` i18n keys).
- **`src/pages/Inventory/page.tsx`**: Inventory management skeleton page (coming soon, uses `inventory.*` i18n keys).
- **`src/pages/LoadingPage.tsx`**: Initial loading animation (~3 seconds, shows only once per browser profile).
- **`src/pages/NotFound.tsx`**: 404 error page (catches all undefined routes).
- **`src/components/layout/SidebarLayout.tsx`**: Collapsible sidebar layout with fixed-width icon column for consistent alignment, smooth cubic-bezier width transitions, mobile drawer with overlay close, desktop collapse/expand without icon resizing, and root shell height set to `h-screen h-dvh` for viewport-safe sizing. Top bar uses `shrink-0` to avoid flex-collapse in scroll contexts, and the main content container owns vertical scrolling via `overflow-y-auto overscroll-y-contain`. Collapse preference is persisted in `localStorage` under `preferred-sidebar-collapsed`; admin users see the admin nav item first in the main nav order (`admin` then default items), while non-admin users keep Scheduler-first ordering.
- Sidebar profile area should immediately reflect profile-picture upload/remove changes; fallback avatar uses name-based initials with a deterministic color picked from a fixed 10-color palette; avatar snapshot state resets on auth teardown to avoid previous-user leakage.
- **Icons**: Use `lucide-react` for UI icons (navigation, actions, status cues). Avoid inline SVG icon markup in shared UI components.
- **`src/components/seo/SeoManager.tsx`**: Route-aware SEO manager — sets title to `<pageTitle> | ARSM`, updates route-specific meta description, robots, Open Graph, Twitter Card, and `html lang`, and sets canonical URL from normalized route path (`/scheduler` and `/dashboard` canonicalize to `/`).
- **`src/components/common/ErrorBoundary.tsx`**: React Error Boundary with i18n-aware fallback UI (title, message, reload button using `errorBoundary.*` keys); logs to console in development only; wraps the main app router in `App.tsx`.
- **`src/components/common/FormErrorMessage.tsx`**: Inline form validation error display (i18n-aware, accepts message key + className).
- **`src/components/common/ToastViewport.tsx`**: App-wide toast viewport (5-second auto-dismiss, green success, red error; login system-error keys `login.serverError500` / `login.databaseUnavailable` use an emphasized variant with a `500` badge).
- **`src/components/common/Modal.tsx`**: Shared dialog shell for confirmation/crop flows; dialog element plays a `modal-enter` entrance animation (fade-in + scale-up, 200ms, defined via `@keyframes modal-enter` in `src/index.css`).
- **`src/components/common/ProfilePictureCropModal.tsx`**: Crop-and-upload flow before profile picture submission.
- **`src/components/layout/ThemeLanguageControls.tsx`**: EN/HU + dark/light controls (accepts `className` prop for repositioning).
- **`src/router/PrivateRoute.tsx`**: Route guard that redirects to `/login` if not authenticated.
- **`src/router/AdminRoute.tsx`**: Route guard that redirects to `/login` if unauthenticated and to `/` if authenticated but not admin.
- **`src/router/PublicOnlyRoute.tsx`**: Route guard that redirects authenticated users to `/`.

## Services & State

- **`src/services/auth/auth.service.ts`**: Login, logout, and auth-state restore via `/api/auth/validate`.
- **`src/services/admin/admin.service.ts`**: registerMechanic/list/delete for admin flows; `GET /api/admin/mechanics` payload includes `hasProfilePicture` for avatar rendering.
- **`src/services/scheduler/appointment.service.ts`**: findCustomerByEmail via `GET /api/customers/by-email`; createIntake via `POST /api/appointments/intake`; updateAppointment via `PUT /api/appointments/{id}` (current UI sends due/task fields plus compatibility vehicle fields; `scheduledDate` is intentionally omitted by the UI because backend enforces immutability); getByMonth, getToday, claim, unclaim, updateStatus, adminAssign, adminUnassign via `/api/appointments`.
- **`src/services/profile/profile.service.ts`**: getProfile, updateProfile, changePassword, uploadProfilePicture, deleteProfilePicture, deleteProfile via `/api/profile`.
- Profile picture upload must send multipart `FormData`; axios request interceptor should clear inherited JSON content-type for FormData payloads so browser boundary headers are applied.
- **`src/store/auth.store.ts`**: Zustand store for `user`, `isAuthenticated`, `isLoading`, `error`.
- **`src/store/theme.store.ts`**: Zustand store for dark/light mode preference.
- **`src/store/scheduler.store.ts`**: Zustand store for `todayAppointments`, `monthAppointments`, `calendarYear`, `calendarMonth`, `selectedDay`, loading states, `upsertAppointment` for optimistic sync after claim/status/intake mutations (including immediate today/month insertion when scheduled date matches current views). Scheduler view state (`year`/`month`/`selectedDay`) persists per tab in `sessionStorage` key `scheduler-selected-view`.
- **`src/store/toast.store.ts`**: Zustand store for global toasts (message key + interpolation values, duration, remove actions).
- **`src/services/http/api.client.ts`**: Axios instance with credentialed cookie requests and refresh retry; requires `VITE_API_URL` from environment (no hardcoded URL fallback).
- **`index.html` metadata baseline**: static description/robots/Open Graph/Twitter/title tags exist in `index.html`; canonical is runtime-managed by `SeoManager` (no static canonical tag in `index.html`).
- **`src/types/auth/login.types.ts`**: TypeScript interfaces for auth API contracts (LoginRequest, LoginResponse, AuthUser, ValidateTokenResponse, RefreshResponse, JwtPayload).
- **`src/types/scheduler/scheduler.types.ts`**: TypeScript interfaces for scheduler (`AppointmentDto` includes `intakeCreatedAt`, `dueDateTime`, `completedAt?`, `canceledAt?`, plus `VehicleDto`, `CustomerSummaryDto`, `MechanicSummaryDto`; `AppointmentStatus` is `'InProgress' | 'Completed' | 'Cancelled'`; includes `CalendarDay`, `UpdateStatusRequest`, `UpdateAppointmentRequest`, `SchedulerCustomerLookupDto`, `SchedulerVehicleLookupDto`, `SchedulerNewVehicleRequest`, `SchedulerCreateIntakeRequest`).
- **`src/types/profile/profile.types.ts`**: TypeScript interfaces for profile (`ProfileData`, `UpdateProfileRequest` (firstName?, lastName?, email?, phoneNumber?, middleName?), `ChangePasswordRequest`, `DeleteProfileRequest`).
- **`src/utils/avatar.ts`**: Deterministic fallback avatar utilities.
- **`src/utils/imageCrop.ts`**: Canvas crop helper for profile image workflow.
- **`src/utils/formStyles.ts`**: Centralized shared Tailwind class strings (`inputClass`, `inputClassCompact`, `readonlyInputClass`, `labelClass`, `cardClass`, `buttonClass`); re-exported by `Admin/RegisterMechanic/constants.ts` and `Settings/constants.ts` instead of duplicating locally.
- **`src/utils/validation.ts`**: Shared input validation — `filterNameInput` (Unicode letters and hyphens only; spaces and apostrophes stripped), `filterPhoneInput` (digits/phone-special-chars only), `isAllowedPictureExtension` (.png/.jpg/.jpeg/.webp).
- **`src/utils/serverValidation.ts`**: Shared backend-validation helpers — `mapValidationMessageToKey(message, context)` central mapping function (email/phone uniqueness, invalid email/phone, invalid name, password errors); `mapAdminValidationMessageToKey` and `mapSettingsValidationMessageToKey` delegate to it; also provides `getServerFieldError`, `extractServerFieldErrors`, `normalizeServerFieldErrors`.
- **`src/utils/i18n.ts`**: i18next configuration; translations split into `src/utils/locales/en.ts` and `src/utils/locales/hu.ts` (keys: login, layout, nav, sidebar, theme, modal, toast, scheduler, admin, settings, tools, inventory, notFound, errorBoundary). `errorBoundary` sub-keys: `title`, `message`, `reload`. Scheduler sub-keys include `scheduler.changeStatus`, `scheduler.monthList.*` (title, count, empty, emptyFiltered, clearFilter), `scheduler.filter.*` (allMechanics, sortAsc, sortDesc), and `scheduler.detail.*` (title, scheduledDate, vehicle, licensePlate, task, customer, customerName, customerEmail, mechanics, specialization, expertise, noMechanics, unassignMe, removeMechanic, addMechanic, selectMechanic, assignError, unassignError, unassignCancelledError, adminUnassignError). EN and HU locale files define these keys explicitly.
- **`src/components/common/Image.tsx`**: Reusable image wrapper component.
- **`vite.config.ts`**: In serve mode, dev server runs over HTTPS (`vite-plugin-mkcert`) on port from `PORT` env var (`strictPort: true`). In build mode, `manualChunks` splits vendor code into: `vendor-react` (react, react-dom, react-router-dom), `vendor-i18n` (i18next, react-i18next, i18next-browser-languagedetector), `vendor-ui` (lucide-react, zustand, axios).
- **`public/robots.txt`**: Served statically — `User-agent: *`, `Allow: /`, `Disallow: /api/`.

## E2E Testing (Playwright)

- Frontend E2E uses `@playwright/test` with config in `playwright.config.ts`.
- E2E test files live under `tests/e2e` (specs + page objects + support helpers).
- Default base URL is `https://localhost:5173`; override with `PLAYWRIGHT_BASE_URL`.
- Playwright web server runs `npm run dev`, ignores local HTTPS certificate errors for readiness checks, and reuses an already running dev server outside CI.
- Supported scripts:
  - `npm run e2e`
  - `npm run e2e:headed`
  - `npm run e2e:ui`

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
- All 7 page components (Login, SchedulerPage, ToolsPage, InventoryPage, NotFound, RegisterMechanicPage, SettingsPage) are lazy-loaded via `React.lazy()`. The `<Suspense fallback={null}>` wrapper surrounds the entire `<Routes>` block in `App.tsx`.

## API Integration

- **Auth endpoints**:
  - `POST /api/auth/login` – (email or phoneNumber) + password → cookie session + profile.
  - `POST /api/auth/refresh` – refresh token rotation + access cookie reissue (server rate-limited by `AuthRefreshAttempts`).
  - `POST /api/auth/logout` – refresh revoke + cookie clear; returns `204 No Content` on success.
  - `GET /api/auth/validate` – validate active authenticated session.
  - `POST /api/auth/login` failure semantics: generic `401 invalid_credentials` for unknown identifier, wrong password, linked mechanic-domain-record gaps, and existing customer email/phone identifiers (enumeration-resistant); `429` lockout/rate-limit.
- **Appointment endpoints**:
  - `GET /api/appointments?year=&month=` – list appointments for a month (authorized).
  - `GET /api/appointments/today` – list today's appointments (authorized).
  - `POST /api/appointments/intake` – create intake appointment from scheduler flow (authorized); scheduler auto-derives scheduled datetime and submits due datetime input.
  - `PUT /api/appointments/{id}` – update appointment fields from detail-modal edit flow (authorized; customer/vehicle fields are unchanged by this endpoint; scheduledDate immutability is enforced).
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
- Form inputs in `BasicInfoSection`, `PersonalInfoSection`, and `ChangePasswordSection` set `aria-invalid` to `true` when a validation error is present for that field, improving screen-reader accessibility.

## Styling & Responsive Design

- Use React function components with strict TypeScript.
- Keep API calling logic in `src/services` and keep components focused on UI/state.
- Keep styles in Tailwind utility classes; avoid unnecessary custom CSS.
- `Inter` is loaded via `index.html` (`<link rel="preconnect">` for `fonts.googleapis.com` and `fonts.gstatic.com`, `<link rel="preload">` + `<link rel="stylesheet">` for Google Fonts CSS). Do not use a CSS `@import` for Google Fonts. `src/index.css` defines an `@font-face` block for `'Inter fallback'` (system font with `size-adjust: 107%`, `ascent-override: 90%`, `descent-override: 22%`, `line-gap-override: 0%`) to reduce CLS; html font-family stack is `'Inter', 'Inter fallback', system-ui, ...`. Avoid resetting components back to system fonts.
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
- `libphonenumber-js` – Client-side identifier parsing/normalization for phone login.
- `i18next` + `react-i18next` – Internationalization.
- `tailwindcss` – Styling (with dark mode support via `darkMode: 'class'`).
- `@playwright/test` – Frontend E2E testing.

## Security Notes

- Never log tokens/cookies or sensitive user data to console.
- Keep auth trust server-side via `/api/auth/validate` and backend cookie/session controls.
- Only mechanics can log in; customers are managed server-side.
- Use HTTPS in production.
- Use `isAxiosError(err)` type guard (from `axios`) instead of `as AxiosError` casts when narrowing caught errors in service/hook catch blocks.

