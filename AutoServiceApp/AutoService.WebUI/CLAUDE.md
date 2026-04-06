# AutoService.WebUI — Frontend Rules

## Auth Flow

- Mechanics-only authentication using backend-managed HttpOnly cookie session.
- Loading page (~3s) shows once per browser profile (`localStorage` key: `loading-page-seen`).
- No valid session → redirect to `/login`. Successful login → redirect to `/`.
- Login identifier input is normalized before submit:
  - email: trim + lowercase
  - phone: accept Hungarian forms (`+36`, `36`, `06`, spaced/punctuated) and normalize to canonical backend-compatible format
- Axios client uses `withCredentials: true` and automatic `POST /api/auth/refresh` retry on `401` for non-auth endpoints.
- Logout calls `POST /api/auth/logout`, clears auth store state, then redirects to `/login`.
- Use `<PrivateRoute>` to guard authenticated pages.
- Use `<AdminRoute>` to guard admin-only pages (redirects to `/` if not admin, `/login` if not authenticated).
- `AuthUser` includes `isAdmin: boolean` — derived from backend `IsAdmin` field in login/validate/refresh responses.
- Sidebar layout: main nav at top, admin nav (shield icon, admin-only) above collapse button, bottom section has profile → settings → logout.
- Sidebar profile block shows uploaded profile picture immediately after successful upload/remove events; if no picture exists, it renders a generated initials avatar with a deterministic color selected from a fixed 10-color palette.
- New global toast system is mounted app-wide (`ToastViewport`) and uses i18n keys from state, so visible toasts update instantly when language/theme changes.
- All UI strings (errors, hovers, aria-labels, placeholders) must use i18n — no hardcoded English text.

## State & Services

- `src/store/auth.store.ts` — Zustand: `isAuthenticated`, `user`, `isLoading`, `error`
- `src/store/theme.store.ts` — Zustand: dark/light preference (saved as `preferred-theme`)
- `src/store/scheduler.store.ts` — Zustand: `todayAppointments`, `monthAppointments`, `calendarYear`, `calendarMonth`, loading states, `upsertAppointment` for optimistic sync
- `src/store/toast.store.ts` — Zustand: global toast queue (`showSuccess`, `showError`, auto-dismiss metadata)
- `src/services/auth.service.ts` — login/logout/session restore via `/api/auth/login`, `/api/auth/logout`, `/api/auth/validate`
- `src/services/admin.service.ts` — registerMechanic() via `POST /api/auth/register`, listMechanics() via `GET /api/admin/mechanics`, deleteMechanic() via `DELETE /api/admin/mechanics/{id}` (all admin-only)
- `src/services/appointment.service.ts` — getByMonth, getToday, claim, updateStatus via `/api/appointments`
- `src/services/profile.service.ts` — getProfile, updateProfile, changePassword, uploadProfilePicture, deleteProfilePicture, deleteProfile via `/api/profile`
- `src/services/profile.service.ts` upload sends multipart `FormData`; axios request interceptor clears inherited JSON content-type for FormData so browser boundary headers are used.
- `src/services/api.client.ts` — Axios instance with credentialed cookie requests and refresh retry; reads `VITE_API_URL` from env, **no hardcoded fallback**
- `src/types/login.types.ts` — `LoginRequest`, `LoginResponse`, `AuthUser` (includes `isAdmin`), `ValidateTokenResponse`
- `src/types/scheduler.types.ts` — `AppointmentDto`, `VehicleDto`, `CustomerSummaryDto`, `MechanicSummaryDto`, `AppointmentStatus`, `CalendarDay`, `UpdateStatusRequest`
- `src/types/profile.types.ts` — `ProfileData`, `UpdateProfileRequest`, `ChangePasswordRequest`
- `src/utils/i18n.ts` — i18next config; translations split into `src/utils/locales/en.ts` and `src/utils/locales/hu.ts` (keys: login, layout, nav, sidebar, theme, scheduler, admin, settings, placeholder, notFound)
- `src/utils/avatar.ts` — deterministic avatar fallback helpers (seeded color + initials)
- `src/utils/imageCrop.ts` — image loading and canvas crop-to-blob helper for profile picture workflow

## Component Map

- `src/pages/Admin/RegisterMechanic/page.tsx` — admin-only mechanic management page (mechanic list with delete + registration form)
- `src/pages/Admin/RegisterMechanic/sections/MechanicListSection.tsx` — mechanic list with delete button (hidden for admin accounts) + confirmation modal
- `src/pages/Settings/page.tsx` — settings page (profile picture with crop modal, personal info, change password, delete profile modal — delete section hidden for admin users)
- `src/pages/Settings/sections/ProfilePictureSection.tsx` — upload/delete profile picture with deterministic fallback preview
- `src/pages/Settings/sections/PersonalInfoSection.tsx` — update email, phone, middle name
- `src/pages/Settings/sections/ChangePasswordSection.tsx` — change password with current/new/confirm fields
- `src/pages/Login/page.tsx` — login form
- `src/pages/Login/login.helpers.ts` — identifier parsing and login error resolution
- `src/pages/Scheduler/page.tsx` — scheduler page (data-fetching orchestrator, today's planner + calendar)
- `src/pages/Scheduler/components/PlannerSpace.tsx` — today's date header + appointment card grid
- `src/pages/Scheduler/components/AppointmentCard.tsx` — single appointment card (vehicle, specs, task, claim/status)
- `src/pages/Scheduler/components/StatusBadge.tsx` — colored status pill
- `src/pages/Scheduler/components/CalendarView.tsx` — monthly calendar with appointment badges
- `src/pages/Dashboard/page.tsx` — legacy dashboard (unused, all dashboard routes render Scheduler)
- `src/pages/Placeholder/page.tsx` — "coming soon" page for nav items not yet implemented
- `src/pages/LoadingPage.tsx` — initial animation, once per session
- `src/pages/NotFound.tsx` — 404 with auto-redirect countdown
- `src/components/layout/SidebarLayout.tsx` — collapsible sidebar layout (mobile drawer always shows expanded labels/icons via CSS responsive classes, tablet icon-only, desktop full/collapsed)
- `src/components/layout/ThemeLanguageControls.tsx` — EN/HU + dark/light toggle (accepts className prop for repositioning)
- `src/components/common/Image.tsx` — reusable image wrapper
- `src/components/common/ToastViewport.tsx` — app-wide toast viewport with 5-second auto-dismiss
- `src/components/common/Modal.tsx` — reusable dialog shell used by settings flows
- `src/components/common/ProfilePictureCropModal.tsx` — image crop dialog for profile picture uploads
- `src/router/PrivateRoute.tsx` — route guard (authenticated)
- `src/router/AdminRoute.tsx` — route guard (admin-only)

## Routing

- `/login` — public
- `/` and `/scheduler` and `/dashboard` — protected, renders Scheduler page inside SidebarLayout
- `/admin/register` — admin-only, RegisterMechanicPage inside SidebarLayout
- `/settings` — protected, SettingsPage inside SidebarLayout (profile picture crop/upload/remove, personal info, password change, delete profile — delete section hidden for admin users)
- `/tools`, `/inventory` — protected, placeholder pages inside SidebarLayout
- `/*` — 404
- Keep `future` flags on BrowserRouter (`v7_startTransition`, `v7_relativeSplatPath`).

## Styling

- Tailwind utility classes only. Avoid custom CSS unless unavoidable.
- Primary accent: pastel purple (`bg-purple-500`, `text-purple-600`).
- Global font: `Inter` from `src/index.css` — do not reset to system fonts.
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
