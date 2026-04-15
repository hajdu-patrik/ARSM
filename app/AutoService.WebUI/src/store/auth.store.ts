/**
 * Authentication state store.
 *
 * Manages the currently authenticated user, loading states,
 * and error feedback for the auth flow. Session is server-authoritative
 * via HttpOnly cookies; this store reflects the local UI state.
 * @module store/auth.store
 */

import { create } from 'zustand';
import type { AuthUser } from '../types/auth/login.types';

/**
 * Shape of the authentication Zustand store.
 */
interface AuthState {
  /** Currently authenticated user, or {@code null} when logged out. */
  user: AuthUser | null;
  /** Whether the user has an active authenticated session. */
  isAuthenticated: boolean;
  /** Whether an auth operation (login, validate, refresh) is in progress. */
  isLoading: boolean;
  /** Current auth error message key, or {@code null} if no error. */
  error: string | null;
  /** Sets the authenticated user. Pass {@code null} to clear. */
  setUser: (user: AuthUser | null) => void;
  /** Updates the authentication flag. */
  setIsAuthenticated: (value: boolean) => void;
  /** Updates the loading state. */
  setIsLoading: (value: boolean) => void;
  /** Sets or clears the error message. */
  setError: (error: string | null) => void;
  /** Resets all auth state to logged-out defaults. */
  clearAuth: () => void;
}

/**
 * Zustand store for authentication state.
 * Used throughout the app to check auth status and access the current user.
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  setUser: (user) => set({ user }),
  setIsAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  clearAuth: () =>
    set({
      user: null,
      isAuthenticated: false,
      error: null,
    }),
}));
