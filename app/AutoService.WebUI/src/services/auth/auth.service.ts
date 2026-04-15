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

/** {@code localStorage} key indicating a session may exist. */
const SESSION_HINT_KEY = 'autoservice-session-hint';

/** In-flight restore promise for single-flight deduplication. */
let restorePromise: Promise<AuthUser | null> | null = null;

/** Records a session hint in {@code localStorage}. */
function setSessionHint(): void {
  localStorage.setItem(SESSION_HINT_KEY, '1');
}

/** Clears the session hint from {@code localStorage}. */
function clearSessionHint(): void {
  localStorage.removeItem(SESSION_HINT_KEY);
}

/**
 * Checks whether a session hint exists, indicating a prior login
 * in this browser that may still be valid.
 * @returns {@code true} if a session hint is present.
 */
function hasSessionHint(): boolean {
  return localStorage.getItem(SESSION_HINT_KEY) === '1';
}

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
    const { expiresAtUtc, personId, personType, email, isAdmin } = response.data;

    const authUser: AuthUser = {
      personId,
      personType,
      email,
      isAdmin,
      expiresAt: new Date(expiresAtUtc),
    };

    setAuthenticatedUser(authUser);
    setSessionHint();

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
      clearSessionHint();
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
    if (!hasSessionHint()) {
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
          clearSessionHint();
          clearAuthState();
          return null;
        }

        const validatedUser: AuthUser = {
          personId: response.data.personId,
          personType: response.data.personType,
          email: response.data.email,
          isAdmin: response.data.isAdmin,
        };

        setAuthenticatedUser(validatedUser);
        setSessionHint();
        return validatedUser;
      } catch {
        clearSessionHint();
        clearAuthState();
        return null;
      } finally {
        restorePromise = null;
      }
    })();

    return restorePromise;
  },
};
