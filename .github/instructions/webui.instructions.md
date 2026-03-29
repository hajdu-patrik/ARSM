---
applyTo: "AutoServiceApp/AutoService.WebUI/**"
description: "Use when editing React frontend, API integration, routing, and UI state in AutoService.WebUI."
---
# AutoService.WebUI Instructions

## Authentication & Authorization

- **JWT-based authentication**: Users (mechanics only) log in with email/phone + password.
- **Token storage**: JWT tokens are stored in `localStorage` under `auth_token` key.
- **Token lifespan**: Backend issues 10-minute JWT tokens; frontend validates expiration.
- **Login flow**:
  1. User sees Loading page (~2.5 seconds) only once on first browser load (`localStorage` key: `loading-page-seen`).
  2. If no valid token exists, redirect to `/login`.
  3. After successful login, redirect to `/` (dashboard).
  4. JWT is automatically attached to all API requests via axios interceptor.
- **Logout**: Clear `localStorage` and redirect to `/login`.
- **Protected routes**: Use `<PrivateRoute>` wrapper to guard dashboard and other authenticated pages.
- **Auth store**: Use Zustand (`useAuthStore`) to manage `isAuthenticated`, `user`, `error`, `isLoading`.
- **Auth service**: Use `authService` from `src/services/auth.service.ts` for login/logout/token checks.

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
  - Add all UI strings to translation resources in `src/i18n.ts`.

## Component Structure

- **`src/pages/Login/page.tsx`**: Login form (email/phone selector, password field, status-based error display).
- **`src/pages/Dashboard/page.tsx`**: Main authenticated dashboard (home page at `/`).
- **`src/pages/LoadingPage.tsx`**: Initial loading animation (~2.5 seconds, shows only once per browser profile).
- **`src/pages/NotFound.tsx`**: 404 error page (catches all undefined routes).
- **`src/components/layout/Layout.tsx`**: Wrapper for authenticated pages (header, footer, shared controls, logout button).
- **`src/components/layout/ThemeLanguageControls.tsx`**: Reusable fixed top-right EN/HU + dark/light controls.
- **`src/router/PrivateRoute.tsx`**: Route guard that redirects to `/login` if not authenticated.

## Services & State

- **`src/services/auth.service.ts`**: Login, logout, token validation, token decode.
- **`src/store/auth.store.ts`**: Zustand store for `user`, `isAuthenticated`, `isLoading`, `error`.
- **`src/store/theme.store.ts`**: Zustand store for dark/light mode preference.
- **`src/services/api.client.ts`**: Axios instance with JWT interceptor; requires `VITE_API_URL` from environment (no hardcoded URL fallback).
- **`src/types/types.ts`**: TypeScript interfaces for API contracts (LoginRequest, LoginResponse, AuthUser).
- **`src/utils/i18n.ts`**: i18next configuration and EN/HU translation resources.
- **`vite.config.ts`**: In serve mode, dev server port is read from environment `PORT` and must be valid (`strictPort: true`).

## Routing

- `/login` → Login page (public).
- `/` → Dashboard (protected, requires valid JWT).
- `/dashboard` → Dashboard alias (protected, requires valid JWT).
- `/*` → 404 Not Found page.
- BrowserRouter should keep `future` flags enabled (`v7_startTransition`, `v7_relativeSplatPath`) to avoid React Router v7 deprecation warnings.

## API Integration

- **Backend endpoints**:
  - `POST /api/auth/login` – (email or phoneNumber) + password → token + profile.
  - `POST /api/auth/login` failure semantics: `404 identifier_not_found` (unknown email/phone), `401 password_incorrect` (wrong password), `500` for linked domain record issues.
  - All other API calls should attach JWT via Authorization header (`Bearer <token>`).
- **VITE_API_URL**: AppHost injects the API base URL as an environment variable.
- **No URL hardcode fallback**: `VITE_API_URL` must come from env (AppHost or `.env.development`).
- **Error handling**: Axios interceptor attaches JWT; login page maps `404/401/500` and network/database availability failures to dedicated EN/HU messages.

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
- `axios` – HTTP client (with JWT interceptor).
- `jwt-decode` – Decode JWT tokens (client-side only).
- `zustand` – State management (auth, theme).
- `i18next` + `react-i18next` – Internationalization.
- `tailwindcss` – Styling (with dark mode support via `darkMode: 'class'`).

## Security Notes

- Never log JWT tokens or sensitive user data to console.
- Tokens are stored in `localStorage` (not httpOnly); consider security implications for production.
- Only mechanics can log in; customers are managed server-side.
- Always validate token expiration before making API calls.
- Use HTTPS in production.

