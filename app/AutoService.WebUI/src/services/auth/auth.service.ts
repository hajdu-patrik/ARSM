/** Auth service: login, logout and session restore, using a {@code localStorage} hint to skip cold-start validate calls. */

import { apiClient } from '../http/api.client';
import { isTransientRequestFailure, redirectToServerError } from '../http/server-error';
import type { LoginRequest, LoginResponse, AuthUser, ValidateTokenResponse } from '../../types/auth/login.types';
import { useAuthStore } from '../../store/auth.store';
import { clearArsmQueryCache } from '../cache/queryClient';
import { clearAuthSessionHint, hasAuthSessionHint, setAuthSessionHint } from './session-hint';

/** In-flight restore promise for single-flight deduplication. */
let restorePromise: Promise<AuthUser | null> | null = null;

/** The store's user for a login or validate response, which share one shape. */
function toAuthUser({ personId, isAdmin, mustChangePassword }: ValidateTokenResponse): AuthUser {
  return { personId, isAdmin, mustChangePassword };
}

/** Updates the auth store with an authenticated user. */
function setAuthenticatedUser(user: AuthUser): void {
  useAuthStore.setState({ user, isAuthenticated: true, error: null });
}

/** Resets the auth store, the private query cache and the other per-user browser state to logged-out defaults. */
function clearAuthState(): void {
  useAuthStore.getState().clearAuth();
}

/** Authentication service object providing login, logout, and session restore operations. */
export const authService = {
  /** Authenticates with email/phone and password via {@code POST /api/auth/login}. */
  async login(request: LoginRequest): Promise<AuthUser> {
    const response = await apiClient.post<LoginResponse>('/api/auth/login', request);
    const authUser = toAuthUser(response.data);

    clearArsmQueryCache();
    setAuthenticatedUser(authUser);
    setAuthSessionHint();

    return authUser;
  },

  /** Logs out via {@code POST /api/auth/logout}; clears local state in {@code finally} even when the request fails. */
  async logout(): Promise<void> {
    try {
      await apiClient.post('/api/auth/logout');
    } finally {
      clearAuthSessionHint();
      clearAuthState();
    }
  },

  /** Restores auth from the cookie session via {@code GET /api/auth/validate}; skips the call with no session hint.
   * A timeout, network error or 5xx keeps the hint and sends the browser to /500, whose reload retries. */
  async restoreAuth(): Promise<AuthUser | null> {
    if (!hasAuthSessionHint()) {
      // Only the stale private cache goes: a full clearAuth() would also drop the public error artwork cache.
      clearArsmQueryCache();
      return null;
    }

    if (restorePromise) {
      return restorePromise;
    }

    restorePromise = (async () => {
      try {
        const response = await apiClient.get<ValidateTokenResponse>('/api/auth/validate', {
          validateStatus: (status) => status === 200 || status === 401,
          skipErrorRedirect: true,
        });

        if (response.status === 401) {
          clearAuthSessionHint();
          clearAuthState();
          return null;
        }

        const validatedUser = toAuthUser(response.data);

        setAuthenticatedUser(validatedUser);
        setAuthSessionHint();
        return validatedUser;
      } catch (error) {
        if (isTransientRequestFailure(error)) {
          redirectToServerError();
          return null;
        }

        clearAuthSessionHint();
        clearAuthState();
        return null;
      } finally {
        restorePromise = null;
      }
    })();

    return restorePromise;
  },
};
