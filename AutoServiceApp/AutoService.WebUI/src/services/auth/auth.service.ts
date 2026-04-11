import { apiClient } from '../http/api.client';
import type { LoginRequest, LoginResponse, AuthUser, ValidateTokenResponse } from '../../types/auth/login.types';
import { useAuthStore } from '../../store/auth.store';

const SESSION_HINT_KEY = 'autoservice-session-hint';

let restorePromise: Promise<AuthUser | null> | null = null;

function setSessionHint(): void {
  localStorage.setItem(SESSION_HINT_KEY, '1');
}

function clearSessionHint(): void {
  localStorage.removeItem(SESSION_HINT_KEY);
}

function hasSessionHint(): boolean {
  return localStorage.getItem(SESSION_HINT_KEY) === '1';
}

function setAuthenticatedUser(user: AuthUser): void {
  useAuthStore.setState({ user, isAuthenticated: true, error: null });
}

function clearAuthState(): void {
  useAuthStore.getState().clearAuth();
}

export const authService = {
  /**
   * Login with email/phone + password
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
   * Logout: clear token and user data
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
   * Check if user is authenticated in current store state
   */
  isAuthenticated(): boolean {
    return useAuthStore.getState().isAuthenticated;
  },

  /**
   * Restore auth state from secure cookie-backed session
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
