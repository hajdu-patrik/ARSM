/** Auth state store; session is server-authoritative via HttpOnly cookies, this store mirrors local UI state. */

import { create } from 'zustand';
import type { AuthUser } from '../types/auth/login.types';
import { clearArsmQueryCache } from '../services/cache/queryClient';
import { logError } from '../utils/devLog';
import { clearErrorIllustrationCache } from '../utils/errorIllustrationCache';
import { clearSchedulerSession } from './scheduler.store';
import { clearToasts } from './toast.store';

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  /** Whether an auth operation (login, validate, refresh) is in progress. */
  isLoading: boolean;
  error: string | null;
  setUser: (user: AuthUser | null) => void;
  setIsAuthenticated: (value: boolean) => void;
  setIsLoading: (value: boolean) => void;
  setError: (error: string | null) => void;
  /** Marks whether the signed-in user still has to replace a temporary password; ignored while signed out. */
  setMustChangePassword: (value: boolean) => void;
  /** Resets auth state, the private query cache and the other per-user browser state to logged-out defaults. */
  clearAuth: () => void;
}

/** Removes the per-user browser state that outlives the query cache: scheduler view, toasts, error artwork. */
function clearUserBrowserState(): void {
  clearSchedulerSession();
  clearToasts();
  clearErrorIllustrationCache().catch((error: unknown) => {
    logError('auth.clearErrorIllustrationCache', error);
  });
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  setUser: (user) => {
    set({ user });
  },
  setIsAuthenticated: (isAuthenticated) => {
    set({ isAuthenticated });
  },
  setIsLoading: (isLoading) => {
    set({ isLoading });
  },
  setError: (error) => {
    set({ error });
  },
  setMustChangePassword: (mustChangePassword) => {
    set((state) => (state.user === null ? state : { user: { ...state.user, mustChangePassword } }));
  },
  clearAuth: () => {
    clearArsmQueryCache();
    clearUserBrowserState();
    set({
      user: null,
      isAuthenticated: false,
      error: null,
    });
  },
}));
