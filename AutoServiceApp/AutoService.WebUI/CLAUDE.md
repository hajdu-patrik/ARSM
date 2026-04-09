# AutoService.WebUI — Frontend Rules

## Auth Flow

- Mechanics-only authentication using backend-managed HttpOnly cookie session.
- Loading page (~3s) shows once per browser profile (`localStorage` key: `loading-page-seen`).
- No valid session → redirect to `/login`. Successful login → redirect to `/`.
- Login identifier input is normalized before submit:
  - email: trim + lowercase
  - phone: accept Hungarian forms (`+36`, `36`, `06`, local national form without prefix like `301112233`, spaced/punctuated) and normalize to canonical backend-compatible format
- Axios client uses `withCredentials: true` and automatic `POST /api/auth/refresh` retry on `401` for non-auth endpoints.
- Logout calls `POST /api/auth/logout`, clears auth store state, then redirects to `/login`.
- Successful logout response is `204 No Content`; frontend still clears local auth state in `finally` to handle network/interceptor edge cases.
- Use `<PrivateRoute>` to guard authenticated pages.
- Use `<AdminRoute>` to guard admin-only pages (redirects to `/` if not admin, `/login` if not authenticated).
- `AuthUser` includes `isAdmin: boolean` — derived from backend `IsAdmin` field in login/validate/refresh responses.
- Sidebar layout: main nav at top, admin nav (shield icon, admin-only) above collapse button, bottom section has profile → settings → logout.
- Sidebar collapse preference persists in `localStorage['preferred-sidebar-collapsed']`; mobile mode uses a drawer with dismiss overlay.
- Sidebar profile block shows uploaded profile picture immediately after successful upload/remove events; if no picture exists, it renders a generated initials avatar with a deterministic color selected from a fixed 10-color palette.
- UI icons use `lucide-react` (navigation, actions, state indicators); avoid inline SVG icon markup in shared UI components.
- New global toast system is mounted app-wide (`ToastViewport`) and uses i18n keys from state, so visible toasts update instantly when language/theme changes.
- All UI strings (errors, hovers, aria-labels, placeholders) must use i18n — no hardcoded English text.

## Input Validation (Client-Side)

- Name fields (first, middle, last) filter input to Unicode letters and hyphens only — spaces and apostrophes are stripped (via `filterNameInput` from `src/utils/validation.ts`). Applied in both admin registration (`BasicInfoSection`) and settings (`PersonalInfoSection`).
- Phone number fields filter input to digits and phone special characters (`+`, `-`, `(`, `)`, space) only (via `filterPhoneInput`). Applied in both admin registration and settings.
- Profile picture upload validates file extension against `.png`, `.jpg`, `.jpeg`, `.webp` before processing (via `isAllowedPictureExtension`). Invalid types show error toast (`toast.pictureInvalidType`).

## State & Services

- `src/store/auth.store.ts` — Zustand: `isAuthenticated`, `user`, `isLoading`, `error`
- `src/store/theme.store.ts` — Zustand: dark/light preference (saved as `preferred-theme`)
- `src/store/scheduler.store.ts` — Zustand: `todayAppointments`, `monthAppointments`, `calendarYear`, `calendarMonth`, loading states, `upsertAppointment` for optimistic sync
- `src/store/toast.store.ts` — Zustand: global toast queue (`showSuccess`, `showError`, auto-dismiss metadata)
- `src/services/auth.service.ts` — login/logout/session restore via `/api/auth/login`, `/api/auth/logout`, `/api/auth/validate`
- `src/services/admin.service.ts` — registerMechanic() via `POST /api/auth/register`, listMechanics() via `GET /api/admin/mechanics`, deleteMechanic() via `DELETE /api/admin/mechanics/{id}` (all admin-only)
- `src/services/appointment.service.ts` — getByMonth, getToday, claim, unclaim, updateStatus, adminAssign, adminUnassign via `/api/appointments`
- `src/services/profile.service.ts` — getProfile, updateProfile, changePassword, uploadProfilePicture, deleteProfilePicture, deleteProfile via `/api/profile`
- `src/services/profile.service.ts` upload sends multipart `FormData`; axios request interceptor clears inherited JSON content-type for FormData so browser boundary headers are used.
- `src/services/api.client.ts` — Axios instance with credentialed cookie requests and refresh retry; reads `VITE_API_URL` from env, **no hardcoded fallback**
- `src/types/login.types.ts` — `LoginRequest`, `LoginResponse`, `AuthUser` (includes `isAdmin`), `ValidateTokenResponse`
- `src/types/scheduler.types.ts` — `AppointmentDto` (includes `completedAt?`, `canceledAt?`), `VehicleDto`, `CustomerSummaryDto`, `MechanicSummaryDto`, `AppointmentStatus` (`'InProgress' | 'Completed' | 'Cancelled'`; `Scheduled` has been removed), `CalendarDay`, `UpdateStatusRequest`
- `src/types/profile.types.ts` — `ProfileData`, `UpdateProfileRequest` (firstName?, lastName?, email?, phoneNumber?, middleName?), `ChangePasswordRequest`
- `src/utils/i18n.ts` — i18next config; translations split into `src/utils/locales/en.ts` and `src/utils/locales/hu.ts` (keys: login, layout, nav, sidebar, theme, modal, toast, scheduler, admin, settings, tools, inventory, notFound). Scheduler sub-keys include `scheduler.monthList.*` (title, count, empty, emptyFiltered, clearFilter), `scheduler.filter.*` (allMechanics, sortAsc, sortDesc), and `scheduler.detail.*` (title, scheduledDate, vehicle, licensePlate, task, customer, customerName, customerEmail, mechanics, specialization, expertise, noMechanics, unassignMe, removeMechanic, addMechanic, selectMechanic, assignError, unassignError, unassignCancelledError, adminUnassignError)
- `src/utils/avatar.ts` — deterministic avatar fallback helpers (seeded color + initials)
- `src/utils/imageCrop.ts` — image loading and canvas crop-to-blob helper for profile picture workflow
- `src/utils/validation.ts` — shared input validation: `filterNameInput` (Unicode letters and hyphens only; spaces and apostrophes stripped), `filterPhoneInput` (digits/phone-special-chars only), `isAllowedPictureExtension` (.png/.jpg/.jpeg/.webp)
- `src/utils/serverValidation.ts` — shared backend-validation helpers: `mapValidationMessageToKey(message, context)` central mapping function (handles email/phone uniqueness, invalid email/phone, invalid name, password errors); `mapAdminValidationMessageToKey` and `mapSettingsValidationMessageToKey` delegate to it; also provides `getServerFieldError`, `extractServerFieldErrors`, `normalizeServerFieldErrors`

## Component Map

- `src/pages/Admin/RegisterMechanic/page.tsx` — admin-only mechanic management page (mechanic list with delete + registration form)
- `src/pages/Admin/RegisterMechanic/sections/MechanicListSection.tsx` — mechanic list with left-aligned profile avatar (reuses `MechanicAvatar`), existing name/email/admin-badge content, delete button (hidden for admin accounts), and confirmation modal; responsive row layout
- `src/pages/Settings/page.tsx` — settings page (profile picture with crop modal, personal info, change password, delete profile modal — delete section hidden for admin users)
- `src/pages/Settings/sections/ProfilePictureSection.tsx` — upload/delete profile picture with deterministic fallback preview
- `src/pages/Settings/sections/PersonalInfoSection.tsx` — update first name, middle name, last name, email, phone
- `src/pages/Settings/sections/ChangePasswordSection.tsx` — change password with current/new/confirm fields; settings page validates `newPassword.length < 8` client-side before submit (matching admin registration behavior)
- `src/pages/Login/page.tsx` — login form
- `src/pages/Login/login.helpers.ts` — identifier parsing and login error resolution
- `src/pages/Scheduler/page.tsx` — scheduler page (data-fetching orchestrator, stacked layout: PlannerSpace on top, then CalendarView full-width, then MonthAppointmentList below); manages `selectedAppointment` and `selectedDay` local state; clears day filter on month change; passes `isAdmin` and handlers for unclaim, adminAssign, adminUnassign to AppointmentDetailModal; keeps modal appointment content synchronized with store updates and runs 8-second background refresh for near-realtime claim/status updates
- `src/pages/Scheduler/components/PlannerSpace.tsx` — today's date header + appointment card grid
- `src/pages/Scheduler/components/AppointmentCard.tsx` — single appointment card (vehicle, specs, task, claim/status); accepts optional `onClick` prop with stopPropagation on interactive controls; mechanic avatars use deterministic per-mechanic colors and use current-user profile picture when available
- `src/pages/Scheduler/components/StatusBadge.tsx` — colored status pill
- `src/pages/Scheduler/components/CalendarView.tsx` — monthly calendar with appointment badges; ±6 month navigation limit (disabled buttons), clickable day cells, selected-day highlight; props: `onDayClick`, `selectedDay`
- `src/pages/Scheduler/components/AppointmentDetailModal.tsx` — full-detail modal for a selected appointment (vehicle, license plate, customer, mechanics with specialization/expertise, task, status controls); props: `isAdmin`, `onUnclaim`, `onAdminAssign`, `onAdminUnassign`; regular mechanics see "Unassign me" button when assigned; admins see per-mechanic remove (X) button and an "Add mechanic" dropdown (fetched from admin service); mechanic assignment controls are disabled when the appointment is Cancelled; uses responsive, overflow-safe layout (`max-h` scroll region, wrapping chips, no overlap) and `Modal` with `max-w-3xl`
- `src/pages/Scheduler/components/MechanicAvatar.tsx` — shared mechanic avatar renderer; uses deterministic color fallback by mechanic ID and mechanic-specific profile picture endpoint when available
- `src/services/profile-picture-live.service.ts` — shared realtime profile-picture update channel (SSE + `autoservice:profile-picture-updated` event fan-out) used by navbar and scheduler avatar refresh flows
- `src/pages/Scheduler/components/MonthAppointmentList.tsx` — monthly appointment list rendered as one continuous sorted card grid with per-card date labels, day filtering, "Show all" clear chip, and loading skeletons; filter bar includes status filter chips (toggleable, colored per status), mechanic dropdown (populated dynamically from appointments), and date sort toggle (asc/desc); all filters combine with each other and with `selectedDay`. Layout rule: on mobile it is single-column full width, on larger screens it is two columns, and if exactly one appointment card is visible it spans full width.
- `src/pages/Tools/page.tsx` — tools management skeleton page (coming soon, uses `tools.*` i18n keys)
- `src/pages/Inventory/page.tsx` — inventory management skeleton page (coming soon, uses `inventory.*` i18n keys)
- `src/pages/LoadingPage.tsx` — initial animation, once per session
- `src/pages/NotFound.tsx` — 404 with auto-redirect countdown
- `src/components/layout/SidebarLayout.tsx` — collapsible sidebar layout (fixed-width icon column for consistent alignment, smooth cubic-bezier width transition, mobile drawer, desktop collapse/expand without icon resizing)
- `src/components/layout/ThemeLanguageControls.tsx` — EN/HU + dark/light toggle (accepts className prop for repositioning)
- `src/components/seo/SeoManager.tsx` — route-aware SEO manager (keeps `document.title` fixed to `ARSM`, updates meta description/robots/Open Graph/Twitter Card/canonical/html lang per route)
- `src/components/common/Image.tsx` — reusable image wrapper
- `src/components/common/FormErrorMessage.tsx` — inline form validation error display (i18n-aware, accepts message key + className)
- `src/components/common/ToastViewport.tsx` — app-wide toast viewport with 5-second auto-dismiss
- `src/components/common/Modal.tsx` — reusable dialog shell used by settings flows
- `src/components/common/ProfilePictureCropModal.tsx` — image crop dialog for profile picture uploads
- `src/router/PrivateRoute.tsx` — route guard (authenticated)
- `src/router/AdminRoute.tsx` — route guard (admin-only)

## Routing

- `/login` — public
- `/` — protected, renders Scheduler page inside SidebarLayout
- `/scheduler` and `/dashboard` — backward-compatibility aliases that redirect to `/`
- `/admin/register` — admin-only, RegisterMechanicPage inside SidebarLayout
- `/settings` — protected, SettingsPage inside SidebarLayout (profile picture crop/upload/remove, personal info, password change, delete profile — delete section hidden for admin users)
- `/tools` — protected, ToolsPage inside SidebarLayout (skeleton page with coming-soon content)
- `/inventory` — protected, InventoryPage inside SidebarLayout (skeleton page with coming-soon content)
- `/*` — 404
- Keep `future` flags on BrowserRouter (`v7_startTransition`, `v7_relativeSplatPath`).

## Styling

- Tailwind utility classes only. Avoid custom CSS unless unavoidable.
- Primary accent: pastel purple (`bg-purple-500`, `text-purple-600`).
- Global font: `Inter` from `src/index.css` — do not reset to system fonts.
- Global CSS in `src/index.css` includes a `select:focus` rule applying a purple ring consistent with the project theme; scheduler select elements use `focus:outline-none` to defer to this rule.
- Both dark and light modes must be visually complete.
- Layouts must be responsive (desktop + mobile).

## i18n & Dark Mode

- Language toggle: EN/HU via `react-i18next`. Preference saved as `preferred-language`.
- Dark mode: `dark` class on `document.documentElement`. Preference saved as `preferred-theme`.
- Toast messages must store i18n keys (not resolved strings) so language/theme changes update visible toasts immediately.
- All new UI strings must be added to both EN and HU locale files (`src/utils/locales/en.ts` and `src/utils/locales/hu.ts`).

## Vite Config

- Dev server runs over HTTPS using `vite-plugin-mkcert` (self-signed cert).
- Dev server port read from `PORT` env var with `strictPort: true`.
- `VITE_API_URL` is required and must come from env (injected by AppHost or `.env.development`).

## Key Dependencies

`react-router-dom`, `axios`, `zustand`, `i18next`, `react-i18next`, `tailwindcss`, `jwt-decode`

## Security

- Never log auth cookies, tokens, or sensitive user data to console.
- Keep auth state server-authoritative via `/api/auth/validate` restore flow.
