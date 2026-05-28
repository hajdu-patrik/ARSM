/**
 * Authentication service.
 *
 * Handles login, logout, and session restoration via the backend
 * cookie-based auth endpoints. Uses a {@code localStorage} session hint
 * to skip unnecessary validate calls on cold starts.
 * @module services/auth/auth.service
 */

import { apiClient } from '../http/api.client';
import type { LoginRequest, LoginResponse, AuthUser, ValidateTokenResponse } from '../../types/auth/login.types';
import { useAuthStore } from '../../store/auth.store';
import { clearAuthSessionHint, hasAuthSessionHint, setAuthSessionHint } from './session-hint';

/** In-flight restore promise for single-flight deduplication. */
let restorePromise: Promise<AuthUser | null> | null = null;

/**
 * Updates the auth store with an authenticated user.
 * @param user - The authenticated user to set.
 */
function setAuthenticatedUser(user: AuthUser): void {
  useAuthStore.setState({ user, isAuthenticated: true, error: null });
}

/** Resets the auth store to its logged-out default state. */
function clearAuthState(): void {
  useAuthStore.getState().clearAuth();
}

/**
 * Authentication service object providing login, logout, and session restore operations.
 */
export const authService = {
  /**
   * Authenticates with email/phone and password via {@code POST /api/auth/login}.
   * @param request - Login credentials.
   * @returns The authenticated user.
   */
  async login(request: LoginRequest): Promise<AuthUser> {
    const response = await apiClient.post<LoginResponse>('/api/auth/login', request);
    const { personId, isAdmin } = response.data;

    const authUser: AuthUser = {
      personId,
      isAdmin,
    };

    setAuthenticatedUser(authUser);
    setAuthSessionHint();

    return authUser;
  },

  /**
   * Logs out by calling {@code POST /api/auth/logout} and clearing local auth state.
   * Always clears state in the {@code finally} block to handle network edge cases.
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post('/api/auth/logout');
    } finally {
      clearAuthSessionHint();
      clearAuthState();
    }
  },

  /**
   * Checks whether the user is currently authenticated based on store state.
   * @returns {@code true} if the auth store indicates an active session.
   */
  isAuthenticated(): boolean {
    return useAuthStore.getState().isAuthenticated;
  },

  /**
   * Restores auth state from a secure cookie-backed session via
   * {@code GET /api/auth/validate}. Uses single-flight deduplication
   * and skips the network call when no session hint is present.
   * @returns The restored user, or {@code null} if no valid session exists.
   */
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
