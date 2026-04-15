# AutoService.WebUI — Frontend Rules

## Auth Flow

- Mechanics-only authentication using backend-managed HttpOnly cookie session.
- Loading page (~3s) shows once per browser profile (`localStorage` key: `loading-page-seen`).
- No valid session → redirect to `/login`. Successful login → redirect to `/`.
- Login identifier input is normalized before submit:
  - email: trim + lowercase
  - phone: parse with `libphonenumber-js` (default country `HU` for local-form parsing), normalize to canonical E.164 format, and accept only backend-aligned European country calling codes
- Axios client uses `withCredentials: true` and automatic `POST /api/auth/refresh` retry on `401` for non-auth endpoints.
- Logout calls `POST /api/auth/logout`, clears auth store state, then redirects to `/login`.
- Successful logout response is `204 No Content`; frontend still clears local auth state in `finally` to handle network/interceptor edge cases.
- Use `<PrivateRoute>` to guard authenticated pages.
- Use `<PublicOnlyRoute>` on the login route to redirect authenticated users back to `/`.
- Use `<AdminRoute>` to guard admin-only pages (redirects to `/` if not admin, `/login` if not authenticated).
- `AuthUser` includes `isAdmin: boolean` — derived from backend `IsAdmin` field in login/validate/refresh responses.
- Sidebar layout: main nav at top (default order: scheduler → tools → inventory for non-admin users; admin users get the admin item injected first: admin → scheduler → tools → inventory), bottom section has profile → settings → logout.
- Sidebar collapse preference persists in `localStorage['preferred-sidebar-collapsed']`; mobile mode uses a drawer with dismiss overlay.
- Sidebar profile block shows uploaded profile picture immediately after successful upload/remove events; if no picture exists, it renders a generated initials avatar with a deterministic color selected from a fixed 10-color palette. Avatar snapshot state is reset on auth teardown to avoid previous-user leakage.
- UI icons use `lucide-react` (navigation, actions, state indicators); avoid inline SVG icon markup in shared UI components.
- New global toast system is mounted app-wide (`ToastViewport`) and uses i18n keys from state, so visible toasts update instantly when language/theme changes.
- All UI strings (errors, hovers, aria-labels, placeholders) must use i18n — no hardcoded English text.

## Input Validation (Client-Side)

- Name fields (first, middle, last) filter input to Unicode letters and hyphens only — spaces and apostrophes are stripped (via `filterNameInput` from `src/utils/validation.ts`). Applied in both admin registration (`BasicInfoSection`) and settings (`PersonalInfoSection`).
- Phone number fields filter input to digits and phone special characters (`+`, `-`, `(`, `)`, space) only (via `filterPhoneInput`). Applied in both admin registration and settings.
- Profile picture upload validates file extension against `.png`, `.jpg`, `.jpeg`, `.webp` before processing (via `isAllowedPictureExtension`). Invalid types show error toast (`toast.pictureInvalidType`).
- Form inputs in `BasicInfoSection`, `PersonalInfoSection`, and `ChangePasswordSection` set `aria-invalid` to `true` when a validation error is present for that field, improving screen-reader accessibility.

## State & Services

- `src/store/auth.store.ts` — Zustand: `isAuthenticated`, `user`, `isLoading`, `error`
- `src/store/theme.store.ts` — Zustand: dark/light preference (saved as `preferred-theme`)
- `src/store/scheduler.store.ts` — Zustand: `todayAppointments`, `monthAppointments`, `calendarYear`, `calendarMonth`, `selectedDay`, loading states, `upsertAppointment` for optimistic sync (including immediate today/month list updates after intake create when the scheduled date belongs to those views). Scheduler view state (`year`/`month`/`selectedDay`) persists per browser tab in `sessionStorage` key `scheduler-selected-view`.
- `src/store/toast.store.ts` — Zustand: global toast queue (`showSuccess`, `showError`, auto-dismiss metadata)
- `src/services/auth/auth.service.ts` — login/logout/session restore via `/api/auth/login`, `/api/auth/logout`, `/api/auth/validate`
- `src/services/admin/admin.service.ts` — registerMechanic() via `POST /api/auth/register`, listMechanics() via `GET /api/admin/mechanics` (includes `hasProfilePicture`), deleteMechanic() via `DELETE /api/admin/mechanics/{id}` (all admin-only; delete can return 422 when backend mechanic-deletion invariants would be violated, and 409 on concurrent contention/serialization conflict)
- `src/services/scheduler/appointment.service.ts` — findCustomerByEmail via `GET /api/customers/by-email`; createIntake via `POST /api/appointments/intake`; updateAppointment via `PUT /api/appointments/{id}` (current UI sends due/task fields plus compatibility vehicle fields; `scheduledDate` is intentionally omitted by the UI because backend enforces immutability); getByMonth, getToday, claim, unclaim, updateStatus, adminAssign, adminUnassign via `/api/appointments`
- `src/services/profile/profile.service.ts` — getProfile, updateProfile, changePassword, uploadProfilePicture, deleteProfilePicture, deleteProfile via `/api/profile`
- `src/services/profile/profile.service.ts` upload sends multipart `FormData`; axios request interceptor clears inherited JSON content-type for FormData so browser boundary headers are used.
- `src/services/http/api.client.ts` — Axios instance with credentialed cookie requests and refresh retry; reads `VITE_API_URL` from env, **no hardcoded fallback**
- `src/types/auth/login.types.ts` — `LoginRequest`, `LoginResponse`, `AuthUser` (includes `isAdmin`), `ValidateTokenResponse`
- `src/types/scheduler/scheduler.types.ts` — `AppointmentDto` (includes `intakeCreatedAt`, `dueDateTime`, `completedAt?`, `canceledAt?`), `VehicleDto`, `CustomerSummaryDto`, `MechanicSummaryDto`, `AppointmentStatus` (`'InProgress' | 'Completed' | 'Cancelled'`; `Scheduled` has been removed), `CalendarDay`, `UpdateStatusRequest`, `UpdateAppointmentRequest`, `SchedulerCustomerLookupDto`, `SchedulerVehicleLookupDto`, `SchedulerNewVehicleRequest`, `SchedulerCreateIntakeRequest`
- `src/types/profile/profile.types.ts` — `ProfileData`, `UpdateProfileRequest` (firstName?, lastName?, email?, phoneNumber?, middleName?), `ChangePasswordRequest`
- `src/utils/i18n.ts` — i18next config; translations split into `src/utils/locales/en.ts` and `src/utils/locales/hu.ts` (keys: login, layout, nav, sidebar, theme, modal, toast, scheduler, admin, settings, tools, inventory, notFound, errorBoundary). `errorBoundary` sub-keys: `title`, `message`, `reload`. Scheduler sub-keys include `scheduler.changeStatus`, `scheduler.monthList.*` (title, count, empty, emptyFiltered, clearFilter), `scheduler.filter.*` (allMechanics, sortAsc, sortDesc), and `scheduler.detail.*` (title, scheduledDate, vehicle, licensePlate, task, customer, customerName, customerEmail, mechanics, specialization, expertise, noMechanics, unassignMe, removeMechanic, addMechanic, selectMechanic, assignError, unassignError, unassignCancelledError, adminUnassignError). EN and HU locale files define these keys explicitly.
- `src/utils/avatar.ts` — deterministic avatar fallback helpers (seeded color + initials)
- `src/utils/imageCrop.ts` — image loading and canvas crop-to-blob helper for profile picture workflow
- `src/utils/formStyles.ts` — centralized shared Tailwind class strings (`inputClass`, `inputClassCompact`, `readonlyInputClass`, `labelClass`, `cardClass`, `buttonClass`); re-exported by `Admin/RegisterMechanic/constants.ts` and `Settings/constants.ts` instead of duplicating locally
- `src/utils/validation.ts` — shared input validation: `filterNameInput` (Unicode letters and hyphens only; spaces and apostrophes stripped), `filterPhoneInput` (digits/phone-special-chars only), `isAllowedPictureExtension` (.png/.jpg/.jpeg/.webp)
- `src/utils/serverValidation.ts` — shared backend-validation helpers: `mapValidationMessageToKey(message, context)` central mapping function (handles email/phone uniqueness, invalid email/phone, invalid name, password errors); `mapAdminValidationMessageToKey` and `mapSettingsValidationMessageToKey` delegate to it; also provides `getServerFieldError`, `extractServerFieldErrors`, `normalizeServerFieldErrors`

## Component Map

- `src/pages/Admin/RegisterMechanic/page.tsx` — admin-only mechanic management page (mechanic list with delete + registration form)
- `src/pages/Admin/RegisterMechanic/helpers.ts` — request-builder and form helper utilities (`buildRegisterMechanicRequest`, `canSubmitForm`, field-error lookup)
- `src/pages/Admin/RegisterMechanic/constants.ts` — specialization/expertise option arrays; re-exports `inputClass`, `labelClass` from `src/utils/formStyles.ts`
- `src/pages/Admin/RegisterMechanic/types.ts` — typed form model and field-error helpers for registration sections
- `src/pages/Admin/RegisterMechanic/sections/BasicInfoSection.tsx` — name/email/phone inputs with shared client-side filters; applies `aria-invalid` on name/email/phone fields when validation errors are present
- `src/pages/Admin/RegisterMechanic/sections/SecuritySection.tsx` — password input with show/hide toggle and inline validation state
- `src/pages/Admin/RegisterMechanic/sections/ProfessionalSection.tsx` — specialization selector and expertise multi-select chips
- `src/pages/Admin/RegisterMechanic/sections/MechanicListSection.tsx` — mechanic list with left-aligned profile avatar (reuses `MechanicAvatar`), existing name/email/admin-badge content, delete button (hidden for admin accounts), and confirmation modal; responsive row layout. Delete warning text in the modal wraps long email values to prevent overflow.
- `src/pages/Settings/page.tsx` — settings page (profile picture with crop modal, personal info, change password, delete profile modal — delete section hidden for admin users)
- `src/pages/Settings/types.ts` — shared settings page type aliases (`FieldErrors`, `GetFieldError`)
- `src/pages/Settings/constants.ts` — settings form-style re-exports (re-exports `inputClass`, `readonlyInputClass`, `labelClass`, `cardClass`, `buttonClass` from `src/utils/formStyles.ts`)
- `src/pages/Settings/helpers.ts` — settings page helper functions for server validation integration (`getFieldError`, `extractFieldErrors`)
- `src/pages/Settings/sections/ProfilePictureSection.tsx` — upload/delete profile picture with deterministic fallback preview
- `src/pages/Settings/sections/PersonalInfoSection.tsx` — update first name, middle name, last name, email, phone; applies `aria-invalid` on fields when validation errors are present
- `src/pages/Settings/sections/ChangePasswordSection.tsx` — change password with current/new/confirm fields; settings page validates `newPassword.length < 8` client-side before submit (matching admin registration behavior); applies `aria-invalid` on fields when validation errors are present
- `src/pages/Login/page.tsx` — login form (email/phone selector, password field, plus dedicated inline system-error panel for `login.serverError500` and `login.databaseUnavailable`)
- `src/pages/Login/login.helpers.ts` — identifier parsing and login error resolution
- `src/pages/Scheduler/page.tsx` — scheduler page (layout orchestrator, stacked layout: top summary strip reflects selected day when selected, otherwise today; then CalendarView full-width, scheduler intake quick section, and MonthAppointmentList); manages `selectedAppointment`, `selectedDay`, and selected-day intake modal state; clears day filter on month change; provides quick intake action for the selected day; passes `isAdmin` and handlers for unclaim, adminAssign, adminUnassign, and update to AppointmentDetailModal; keeps modal appointment content synchronized with store updates; selected day/month view is session-only persisted by the scheduler store. The scheduler wrapper intentionally does not own `h-full`/`overflow-auto` so vertical scrolling is owned by the shared sidebar shell. Data-fetching and background refresh are delegated to `useSchedulerDataSync`.
- `src/pages/Scheduler/hooks/useSchedulerDataSync.ts` — extracted data-fetching and background-refresh hook; fetches today's appointments on mount, fetches the selected month on calendar changes, runs 8-second background poll for near-realtime claim/status updates, and triggers immediate refresh on profile-picture SSE events. Uses request-id and current-view refs to prevent stale-closure races and out-of-order writes. Distinguishes auth-expired (`401/403`) versus generic load failures via dedicated i18n toast keys.
- `src/pages/Scheduler/components/shared/AppointmentCard.tsx` — single appointment card (vehicle, specs, task, claim controls); accepts optional `onClick` prop with stopPropagation on interactive controls; mechanic avatars use deterministic per-mechanic colors and use current-user profile picture when available; claim CTA is rendered in a centered row with a full-width button
- `src/pages/Scheduler/components/shared/StatusBadge.tsx` — colored status pill
- `src/pages/Scheduler/components/calendar/CalendarView.tsx` — monthly calendar with appointment badges; calendar widget content is non-selectable (`select-none`); mobile day cells show max 1 badge, mobile week rows enforce a uniform taller minimum height whenever any day in that week has appointments, and mobile overflow `+N` is rendered above the appointment dot indicator; day-number row and indicator block use fixed minimum heights to keep mobile row baselines aligned week-to-week; desktop day cells show max 3 badges with overflow `+N`; ±6 month navigation limit (disabled buttons), clickable day cells, selected-day highlight; props: `onDayClick`, `selectedDay`
- `src/pages/Scheduler/components/detail/AppointmentDetailModal.tsx` — container/orchestrator for the selected-appointment modal (state, callbacks, modal composition). Props: `isAdmin`, `onUnclaim`, `onAdminAssign`, `onAdminUnassign`, `onUpdate`; behavior remains unchanged: regular mechanics see "Unassign me" only when they are assigned and more than one mechanic is assigned, admins get per-mechanic remove (X) when more than one mechanic is assigned plus an "Add mechanic" dropdown, and admin remove uses a confirmation modal. Claim button is hidden for overdue appointments; mechanic mutation controls are locked when the appointment is `Cancelled` or `Completed`. Status change in the footer is assigned-only (no admin override unless the admin is also assigned). In edit mode, mechanics/claim/admin controls are hidden, and the assigned/claimed-appointment status dropdown is hidden until edit mode is exited; scheduled datetime stays display-only while due datetime and task description remain editable; update payload includes due/task plus compatibility vehicle fields (`dueDateTime`, `taskDescription`, `licensePlate`, `brand`, `model`, `year`, `mileageKm`, `enginePowerHp`, `engineTorqueNm`).
- `src/pages/Scheduler/components/detail/AppointmentDetailModal.sections.tsx` — extracted detail modal body/presentational sections (`AppointmentDetailBody`) for import-boundary stabilization; uses `inputClassCompact` from `src/utils/formStyles.ts` for compact input fields in the detail view; mechanic assign select has `aria-label` from `scheduler.detail.selectMechanic` i18n key; self-unassign control is hidden when unassigning would leave zero mechanics
- `src/pages/Scheduler/components/detail/AppointmentDetailModal.footer.tsx` — extracted detail modal footer/status-action section (`AppointmentDetailFooter`) for import-boundary stabilization; status change select has `aria-label` from `scheduler.changeStatus` i18n key; claim CTA is rendered in a full-width centered row in the footer
- `src/pages/Scheduler/components/detail/AppointmentDetailModal.view.tsx` — compatibility barrel that re-exports modal presentational pieces (`AppointmentDetailBody`, `AppointmentDetailFooter`)
- `src/pages/Scheduler/components/detail/AppointmentDetailModal.edit.ts` — extracted edit-form model/builders/validation (`EditFormState`, `buildEditForm`, `buildUpdateRequestFromEditForm`, vehicle numeric normalization)
- `src/pages/Scheduler/components/detail/AppointmentDetailRemoveMechanicModal.tsx` — extracted admin remove-mechanic confirmation modal (receives `pendingRemoveMechanic`, `removingMechanicId`, `isCancelled`; delegates confirm/close callbacks)
- `src/pages/Scheduler/hooks/useAdminMechanics.ts` — extracted admin mechanic-list hook for modal assign/remove flows (includes profile-picture-update event refresh); silent catch block logs errors in development only via `import.meta.env.DEV`
- `src/pages/Scheduler/hooks/useSchedulerActions.ts` — extracted scheduler mutation callbacks hook; provides stable, memoized handlers for claim, unclaim, status change, admin assign/unassign, intake creation, and appointment update with optimistic store upserts and success/error toasts
- `src/pages/Scheduler/hooks/useSchedulerSummary.ts` — extracted summary-strip data computation hook; derives selected date object, formatted label, past-day check, display text, and appointment count for the selected day or today
- `src/pages/Scheduler/components/summary/SchedulerSummaryStrip.tsx` — summary strip component displayed at the top of the scheduler page; shows the context date label and appointment count for the selected day or today
- `src/pages/Scheduler/components/summary/SchedulerQuickIntakeSection.tsx` — quick intake action section; displays selected day label and button to open intake modal (button disabled when no day is selected)
- `src/pages/Scheduler/components/intake/SchedulerIntakeModal.tsx` — selected-day intake modal container/orchestrator that wires shared intake sections and form hook; auto-derived scheduled datetime (selected day + current send time), due datetime input, email customer lookup, existing/new vehicle modes, and customer create fallback when lookup misses (including backend mechanic-email owner-link resolution path). In the not-found flow, submission can proceed without manual customer first/last names so backend can resolve/create the linked customer for mechanic-email intake; if either first/last name is entered manually, both are required.
- `src/pages/Scheduler/components/intake/SchedulerIntakeModal.helpers.ts` — extracted intake helper utilities (request building, error parsing, vehicle numeric clamping)
- `src/pages/Scheduler/components/intake/SchedulerIntakeModal.types.ts` — extracted intake type definitions (`LookupState`, `VehicleMode`, `IntakeApiError`, `VehicleFormState`, `SchedulerIntakeFormState`, `VEHICLE_NUMERIC_LIMITS`)
- `src/pages/Scheduler/components/intake/SchedulerIntakeSections.tsx` — extracted intake UI sections with unified form-field styling and explicit placeholders across customer/vehicle/task inputs. Intake sections keep grouped user/vehicle/task titles; existing-vehicle dropdown keeps its placeholder option disabled (non-selectable); create-customer labels indicate optional middle name and phone.
- `src/pages/Scheduler/hooks/useSchedulerIntakeForm.ts` — extracted intake form-state/lookup hook. Editing the lookup email resets lookup-dependent UI state (vehicle mode selection, selected existing vehicle, task section), and lookup failures also clear stale lookup-derived sections before surfacing the error.
- `src/pages/Scheduler/components/intake/SchedulerIntakeModal.tsx` + `useSchedulerIntakeForm` + `SchedulerIntakeSections` — vehicle numeric inputs clamp to documented max ranges client-side and map backend numeric validation errors.
- `src/pages/Scheduler/utils/due-date.ts` — due-state utility (`today`/`overdue`/`days left`) used by scheduler cards and detail modal; also exports `buildSelectedDayIso` and `toDatetimeLocalValue` helpers used by intake
- `src/pages/Scheduler/components/shared/MechanicAvatar.tsx` — shared mechanic avatar renderer; uses deterministic color fallback by mechanic ID and mechanic-specific profile picture endpoint when available
- `src/services/profile/profile-picture-live.service.ts` — shared realtime profile-picture update channel (SSE + `autoservice:profile-picture-updated` event fan-out) used by navbar and scheduler avatar refresh flows; reconnect is auth-aware and lifecycle-token guarded, attempts `/api/auth/refresh` on SSE errors, clears auth and stops reconnect attempts on refresh `401/403` (session expiry/auth clear), and teardown clears timers/event-source handles when the last subscriber unsubscribes.
- `src/pages/Scheduler/components/calendar/MonthAppointmentList.tsx` — monthly appointment list rendered as one continuous sorted card grid, day filtering, "Show all" clear chip, and loading skeletons; header badge count always displays the full month total (`appointments.length`) regardless of selected day or active filters; filter bar includes status filter chips (toggleable, colored per status), mechanic dropdown (populated dynamically from appointments) with `aria-label` from `scheduler.filter.allMechanics` i18n key, and date sort toggle (asc/desc); all filters combine with each other and with `selectedDay`. Layout rule: on mobile it is single-column full width, on larger screens it is two columns, and if exactly one appointment card is visible it spans full width.
- `src/pages/Scheduler/utils/scheduler-datetime.ts` — shared scheduler date/time formatting and day-comparison helpers used by scheduler components and hooks.
- `src/pages/Tools/page.tsx` — tools management skeleton page (coming soon, uses `tools.*` i18n keys)
- `src/pages/Inventory/page.tsx` — inventory management skeleton page (coming soon, uses `inventory.*` i18n keys)
- `src/pages/LoadingPage.tsx` — initial animation, once per browser profile
- `src/pages/NotFound.tsx` — 404 with auto-redirect countdown
- `src/components/layout/SidebarLayout.tsx` — collapsible sidebar layout (fixed-width icon column for consistent alignment, smooth cubic-bezier width transition, mobile drawer, desktop collapse/expand without icon resizing, root shell uses `h-screen h-dvh` for viewport-safe height); top bar is `shrink-0` to prevent flex-collapse in scroll layouts, and main content keeps scroll ownership with `overflow-y-auto overscroll-y-contain`; admin users see the admin nav item first in the main nav order (`admin` then default items), while non-admin users keep Scheduler-first ordering
- `src/components/layout/ThemeLanguageControls.tsx` — EN/HU + dark/light toggle (accepts className prop for repositioning)
- `src/components/seo/SeoManager.tsx` — route-aware SEO manager (sets title to `<pageTitle> | ARSM`, updates meta description/robots/Open Graph/Twitter Card/html lang per route, and sets canonical URL from normalized route path where `/scheduler` and `/dashboard` canonicalize to `/`)
- `src/components/common/Image.tsx` — reusable image wrapper
- `src/components/common/ErrorBoundary.tsx` — React Error Boundary with i18n-aware fallback UI (title, message, reload button using `errorBoundary.*` keys); logs to console in development only; wraps the main app router in `App.tsx`
- `src/components/common/FormErrorMessage.tsx` — inline form validation error display (i18n-aware, accepts message key + className)
- `src/components/common/ToastViewport.tsx` — app-wide toast viewport with 5-second auto-dismiss; system login-error keys (`login.serverError500`, `login.databaseUnavailable`) render with an emphasized variant and `500` badge
- `src/components/common/Modal.tsx` — reusable dialog shell used by settings flows; dialog element has a `modal-enter` CSS entrance animation (fade-in + scale-up, 200ms, defined via `@keyframes modal-enter` in `src/index.css`)
- `src/components/common/ProfilePictureCropModal.tsx` — image crop dialog for profile picture uploads
- `src/router/PrivateRoute.tsx` — route guard (authenticated)
- `src/router/AdminRoute.tsx` — route guard (admin-only)
- `src/router/PublicOnlyRoute.tsx` — route guard for public-only pages (redirects authenticated users to `/`)

## Routing

- `/login` — public-only (wrapped in `PublicOnlyRoute`)
- `/` — protected, renders Scheduler page inside SidebarLayout
- `/scheduler` and `/dashboard` — backward-compatibility aliases that redirect to `/`
- `/admin/register` — admin-only, RegisterMechanicPage inside SidebarLayout
- `/settings` — protected, SettingsPage inside SidebarLayout (profile picture crop/upload/remove, personal info, password change, delete profile — delete section hidden for admin users)
- `/tools` — protected, ToolsPage inside SidebarLayout (skeleton page with coming-soon content)
- `/inventory` — protected, InventoryPage inside SidebarLayout (skeleton page with coming-soon content)
- `/*` — 404
- Keep `future` flags on BrowserRouter (`v7_startTransition`, `v7_relativeSplatPath`).
- All 7 page components (Login, SchedulerPage, ToolsPage, InventoryPage, NotFound, RegisterMechanicPage, SettingsPage) are lazy-loaded via `React.lazy()`. The `<Suspense fallback={null}>` wrapper surrounds the entire `<Routes>` block in `App.tsx`.

## Styling

- Tailwind utility classes only. Avoid custom CSS unless unavoidable.
- Primary accent: pastel purple (`bg-purple-500`, `text-purple-600`).
- Global font: `Inter` loaded via `index.html` (`<link rel="preconnect">` for `fonts.googleapis.com` and `fonts.gstatic.com`, `<link rel="preload">` + `<link rel="stylesheet">` for the Google Fonts CSS). Do not use a CSS `@import` for Google Fonts.
- `src/index.css` defines an `@font-face` block for `'Inter fallback'` (system font with `size-adjust: 107%`, `ascent-override: 90%`, `descent-override: 22%`, `line-gap-override: 0%`) to reduce CLS during font swap. The `html` font-family stack is `'Inter', 'Inter fallback', system-ui, ...`.
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
- `index.html` provides baseline SEO metadata (description, robots, Open Graph, Twitter card, title). Canonical is runtime-managed by `SeoManager` (no static canonical tag in `index.html`).
- `public/robots.txt` is served statically (User-agent: *, Allow: /, Disallow: /api/).
- `build.rollupOptions.output.manualChunks` splits vendor code into three named chunks: `vendor-react` (react, react-dom, react-router-dom), `vendor-i18n` (i18next, react-i18next, i18next-browser-languagedetector), `vendor-ui` (lucide-react, zustand, axios).

## Key Dependencies

`react-router-dom`, `axios`, `zustand`, `react-easy-crop`, `libphonenumber-js`, `i18next`, `react-i18next`, `tailwindcss`, `jwt-decode`

## Security

- Never log auth cookies, tokens, or sensitive user data to console.
- Keep auth state server-authoritative via `/api/auth/validate` restore flow.
- Use `isAxiosError(err)` type guard (from `axios`) instead of `as AxiosError` casts when narrowing caught errors in service/hook catch blocks.
