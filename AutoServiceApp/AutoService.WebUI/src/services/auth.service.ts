import { apiClient } from './api.client';
import type { LoginRequest, LoginResponse, AuthUser } from '../types/types';
import { jwtDecode } from 'jwt-decode';
import { useAuthStore } from '../store/auth.store';

const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_USER_KEY = 'auth_user';

export const authService = {
  /**
   * Login with email/phone + password
   */
  async login(request: LoginRequest): Promise<AuthUser> {
    const response = await apiClient.post<LoginResponse>('/api/auth/login', request);
    const { token, expiresAtUtc, personId, personType, email } = response.data;

    const authUser: AuthUser = {
      personId,
      personType,
      email,
      token,
      expiresAt: new Date(expiresAtUtc),
    };

    // Store token and user data
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(authUser));

    // Update store
    useAuthStore.setState({ user: authUser, isAuthenticated: true });

    return authUser;
  },

  /**
   * Logout: clear token and user data
   */
  logout(): void {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    useAuthStore.setState({ user: null, isAuthenticated: false });
  },

  /**
   * Get stored authentication token
   */
  getToken(): string | null {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  },

  /**
   * Get stored user data
   */
  getUser(): AuthUser | null {
    const userJson = localStorage.getItem(AUTH_USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
  },

  /**
   * Check if token is expired
   */
  isTokenExpired(): boolean {
    const user = this.getUser();
    if (!user) return true;

    const now = new Date();
    return now >= new Date(user.expiresAt);
  },

  /**
   * Check if user is authenticated (token exists and not expired)
   */
  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;

    return !this.isTokenExpired();
  },

  /**
   * Restore auth state from localStorage
   */
  restoreAuth(): AuthUser | null {
    const user = this.getUser();
    if (user && !this.isTokenExpired()) {
      useAuthStore.setState({ user, isAuthenticated: true });
      return user;
    }

    // Clear invalid token
    this.logout();
    return null;
  },

  /**
   * Decode JWT payload (without verification)
   */
  decodeToken(token: string): Record<string, unknown> | null {
    try {
      return jwtDecode(token);
    } catch {
      return null;
    }
  },
};
