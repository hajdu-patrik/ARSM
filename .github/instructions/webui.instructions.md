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
- **Protected routes**: Use `<PrivateRoute>` wrapper to guard dashboard and other authenticated pages.
- **Auth store**: Use Zustand (`useAuthStore`) to manage `isAuthenticated`, `user`, `error`, `isLoading`.
- **Auth service**: Use `authService` from `src/services/auth.service.ts` for login/logout/validate-based restore.
- **Identifier parsing** (login UI):
  - emails are trimmed and lowercased before submit,
  - Hungarian phone formats (`+36`, `36`, `06`, spaced/punctuated forms) are normalized before submit,
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
- **`src/pages/Scheduler/page.tsx`**: Scheduler page — data-fetching orchestrator, renders PlannerSpace + CalendarView.
- **`src/pages/Scheduler/components/PlannerSpace.tsx`**: Today's date header + appointment card grid + loading skeleton + empty state.
- **`src/pages/Scheduler/components/AppointmentCard.tsx`**: Single appointment card with vehicle info, specs, task, mechanic avatars, claim/status controls.
- **`src/pages/Scheduler/components/StatusBadge.tsx`**: Colored status pill (Scheduled/InProgress/Completed/Cancelled).
- **`src/pages/Scheduler/components/CalendarView.tsx`**: Monthly calendar grid (Monday-start, ISO/Hungarian convention), appointment badges, month navigation.
- **`src/pages/Admin/RegisterMechanic/sections/MechanicListSection.tsx`**: Mechanic list with delete button (hidden for admins) + confirmation modal. Refreshes after successful registration.
- **`src/pages/Settings/page.tsx`**: Settings page — data-fetching orchestrator, renders ProfilePictureSection + PersonalInfoSection + ChangePasswordSection. Delete profile section hidden for admin users.
- **`src/pages/Settings/sections/ProfilePictureSection.tsx`**: Upload/delete profile picture with avatar preview (crop modal opens before upload).
- **`src/pages/Settings/sections/PersonalInfoSection.tsx`**: Update email, phone, middle name (first/last name read-only).
- **`src/pages/Settings/sections/ChangePasswordSection.tsx`**: Change password with current/new/confirm fields and show/hide toggle.
- **`src/pages/Dashboard/page.tsx`**: Legacy dashboard (route now renders scheduler).
- **`src/pages/Placeholder/page.tsx`**: "Coming soon" placeholder for nav items not yet implemented.
- **`src/pages/LoadingPage.tsx`**: Initial loading animation (~3 seconds, shows only once per browser profile).
- **`src/pages/NotFound.tsx`**: 404 error page (catches all undefined routes).
- **`src/components/layout/SidebarLayout.tsx`**: Collapsible sidebar layout with nav items, logo, user section, theme controls in top bar. Responsive: mobile drawer always shows expanded layout with labels via CSS responsive classes (hamburger), tablet icon-only, desktop full/collapsed (persisted to localStorage).
- Sidebar profile area should immediately reflect profile-picture upload/remove changes; fallback avatar uses name-based initials with a deterministic color picked from a fixed 10-color palette.
- **`src/components/common/ToastViewport.tsx`**: App-wide toast viewport (5-second auto-dismiss, green success, red error).
- **`src/components/common/Modal.tsx`**: Shared dialog shell for confirmation/crop flows.
- **`src/components/common/ProfilePictureCropModal.tsx`**: Crop-and-upload flow before profile picture submission.
- **`src/components/layout/ThemeLanguageControls.tsx`**: EN/HU + dark/light controls (accepts `className` prop for repositioning).
- **`src/router/PrivateRoute.tsx`**: Route guard that redirects to `/login` if not authenticated.

## Services & State

- **`src/services/auth.service.ts`**: Login, logout, and auth-state restore via `/api/auth/validate`.
- **`src/services/appointment.service.ts`**: getByMonth, getToday, claim, updateStatus via `/api/appointments`.
- **`src/services/profile.service.ts`**: getProfile, updateProfile, changePassword, uploadProfilePicture, deleteProfilePicture, deleteProfile via `/api/profile`.
- Profile picture upload must send multipart `FormData`; axios request interceptor should clear inherited JSON content-type for FormData payloads so browser boundary headers are applied.
- **`src/store/auth.store.ts`**: Zustand store for `user`, `isAuthenticated`, `isLoading`, `error`.
- **`src/store/theme.store.ts`**: Zustand store for dark/light mode preference.
- **`src/store/scheduler.store.ts`**: Zustand store for `todayAppointments`, `monthAppointments`, `calendarYear`, `calendarMonth`, loading states, `upsertAppointment` for optimistic sync after claim/status mutations.
- **`src/store/toast.store.ts`**: Zustand store for global toasts (message key + interpolation values, duration, remove actions).
- **`src/services/api.client.ts`**: Axios instance with credentialed cookie requests and refresh retry; requires `VITE_API_URL` from environment (no hardcoded URL fallback).
- **`src/types/login.types.ts`**: TypeScript interfaces for auth API contracts (LoginRequest, LoginResponse, AuthUser, ValidateTokenResponse, RefreshResponse, JwtPayload).
- **`src/types/scheduler.types.ts`**: TypeScript interfaces for scheduler (AppointmentDto, VehicleDto, CustomerSummaryDto, MechanicSummaryDto, AppointmentStatus, CalendarDay, UpdateStatusRequest).
- **`src/types/profile.types.ts`**: TypeScript interfaces for profile (ProfileData, UpdateProfileRequest, ChangePasswordRequest, DeleteProfileRequest).
- **`src/utils/avatar.ts`**: Deterministic fallback avatar utilities.
- **`src/utils/imageCrop.ts`**: Canvas crop helper for profile image workflow.
- **`src/utils/i18n.ts`**: i18next configuration; translations split into `src/utils/locales/en.ts` and `src/utils/locales/hu.ts` (keys: login, layout, nav, sidebar, theme, scheduler, admin, settings, placeholder, notFound).
- **`src/components/common/Image.tsx`**: Reusable image wrapper component.
- **`vite.config.ts`**: In serve mode, dev server runs over HTTPS (`vite-plugin-mkcert`) on port from `PORT` env var (`strictPort: true`).

## Routing

- `/login` → Login page (public).
- `/` → Scheduler page (protected, requires valid auth session).
- `/scheduler` → Scheduler page (protected).
- `/dashboard` → Scheduler page (backward compatibility alias).
- `/tools` → Placeholder page (protected).
- `/inventory` → Placeholder page (protected).
- `/settings` → Settings page (protected) — profile picture crop/upload/remove, personal info, password change, profile deletion.
- `/*` → 404 Not Found page.
- All protected routes render inside `<SidebarLayout>`.
- BrowserRouter should keep `future` flags enabled (`v7_startTransition`, `v7_relativeSplatPath`) to avoid React Router v7 deprecation warnings.

## API Integration

- **Auth endpoints**:
  - `POST /api/auth/login` – (email or phoneNumber) + password → cookie session + profile.
  - `POST /api/auth/refresh` – refresh token rotation + access cookie reissue.
  - `POST /api/auth/logout` – refresh revoke + cookie clear.
  - `GET /api/auth/validate` – validate active authenticated session.
  - `POST /api/auth/login` failure semantics: generic `401 invalid_credentials`, `403 mechanic_only_login` for existing customer email/phone identifiers, `429` lockout/rate-limit, `500` linked domain-record issues.
- **Appointment endpoints**:
  - `GET /api/appointments?year=&month=` – list appointments for a month (authorized).
  - `GET /api/appointments/today` – list today's appointments (authorized).
  - `PUT /api/appointments/{id}/claim` – mechanic claims an appointment (authorized).
  - `PUT /api/appointments/{id}/status` – update appointment status (authorized, assigned mechanic only).
- **Profile endpoints**:
  - `GET /api/profile` – get current user profile data (authorized).
  - `PUT /api/profile` – update email, phone, middle name (authorized).
  - `POST /api/profile/change-password` – change password (authorized).
  - `DELETE /api/profile` – delete current user profile after current-password confirmation (authorized, returns 403 for admin users).
  - `GET /api/profile/picture` – get profile picture (authorized).
  - `PUT /api/profile/picture` – upload profile picture, multipart/form-data (authorized).
  - `DELETE /api/profile/picture` – delete profile picture (authorized).
- **Admin endpoints**:
  - `GET /api/admin/mechanics` – list all mechanics with admin flag (authorized, admin-only).
  - `DELETE /api/admin/mechanics/{id}` – delete a mechanic (authorized, admin-only, returns 403 for admin targets or self-deletion).
- **VITE_API_URL**: AppHost injects the API base URL as an environment variable.
- **No URL hardcode fallback**: `VITE_API_URL` must come from env (AppHost or `.env.development`).
- **Error handling**: Axios interceptor handles refresh-on-401 flow and login page maps `401/403/429/500` and network/database availability failures to dedicated EN/HU messages.
- **Global toast handling**: Use message keys in toast state (not translated strings) so visible toasts update instantly on language/theme change.

## Styling & Responsive Design

- Use React function components with strict TypeScript.
- Keep API calling logic in `src/services` and keep components focused on UI/state.
- Keep styles in Tailwind utility classes; avoid unnecessary custom CSS.
- Keep global typography default as `Inter` from `src/index.css`; avoid resetting components back to system fonts.
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

