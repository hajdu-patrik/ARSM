/** Auth service: login, logout and session restore, using a {@code localStorage} hint to skip cold-start validate calls. */

import { apiClient } from '../http/api.client';
import type { LoginRequest, LoginResponse, AuthUser, ValidateTokenResponse } from '../../types/auth/login.types';
import { useAuthStore } from '../../store/auth.store';
import { clearArsmQueryCache } from '../cache/queryClient';
import { clearAuthSessionHint, hasAuthSessionHint, setAuthSessionHint } from './session-hint';

/** In-flight restore promise for single-flight deduplication. */
let restorePromise: Promise<AuthUser | null> | null = null;

/** Updates the auth store with an authenticated user. */
function setAuthenticatedUser(user: AuthUser): void {
  useAuthStore.setState({ user, isAuthenticated: true, error: null });
}

/** Resets the auth store and private query cache to logged-out defaults. */
function clearAuthState(): void {
  useAuthStore.getState().clearAuth();
}

/** Authentication service object providing login, logout, and session restore operations. */
export const authService = {
  /** Authenticates with email/phone and password via {@code POST /api/auth/login}. */
  async login(request: LoginRequest): Promise<AuthUser> {
    const response = await apiClient.post<LoginResponse>('/api/auth/login', request);
    const { personId, isAdmin } = response.data;

    const authUser: AuthUser = {
      personId,
      isAdmin,
    };

    clearArsmQueryCache();
    setAuthenticatedUser(authUser);
    setAuthSessionHint();

    return authUser;
  },

  /** Logs out via {@code POST /api/auth/logout}; clears local state in {@code finally} even on network failure. */
  async logout(): Promise<void> {
    try {
      await apiClient.post('/api/auth/logout');
    } finally {
      clearAuthSessionHint();
      clearAuthState();
    }
  },

  /** Checks whether the user is currently authenticated based on store state. */
  isAuthenticated(): boolean {
    return useAuthStore.getState().isAuthenticated;
  },

  /** Restores auth from the cookie session via {@code GET /api/auth/validate}; skips the call with no session hint. */
  async restoreAuth(): Promise<AuthUser | null> {
    if (!hasAuthSessionHint()) {
      clearAuthState();
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

        const validatedUser: AuthUser = {
          personId: response.data.personId,
          isAdmin: response.data.isAdmin,
        };

        setAuthenticatedUser(validatedUser);
        setAuthSessionHint();
        return validatedUser;
      } catch {
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
