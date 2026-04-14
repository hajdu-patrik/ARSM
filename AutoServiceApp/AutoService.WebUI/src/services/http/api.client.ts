/**
 * Configured Axios HTTP client for API communication.
 *
 * Reads the base URL from {@code VITE_API_URL} (no hardcoded fallback).
 * Includes request interceptor for {@code FormData} content-type handling
 * and response interceptor for automatic {@code 401} token refresh with
 * single-flight deduplication and login password redaction.
 * @module services/http/api.client
 */

import axios from 'axios';
import type { AxiosError, AxiosInstance } from 'axios';
import { useAuthStore } from '../../store/auth.store';
import type { RefreshResponse } from '../../types/auth/login.types';

/** Base API URL read from environment configuration. */
const API_URL = import.meta.env.VITE_API_URL;

/** Auth endpoint paths excluded from the automatic refresh retry. */
const LOGIN_PATH = '/api/auth/login';
const REFRESH_PATH = '/api/auth/refresh';
const LOGOUT_PATH = '/api/auth/logout';
const VALIDATE_PATH = '/api/auth/validate';

if (!API_URL) {
  throw new Error('VITE_API_URL is not configured. Set it via AppHost or .env.development.');
}

/** In-flight refresh promise for single-flight deduplication. */
let refreshPromise: Promise<void> | null = null;

/** Tracks requests that have already been retried after a 401 to prevent infinite loops. */
const retriedRequests = new WeakSet<object>();

/**
 * Type guard that checks whether a value is a non-null object (record).
 * @param value - The value to check.
 * @returns {@code true} if the value is a plain object.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Type guard that checks whether an object has a {@code delete} method.
 * Used to safely interact with Axios headers objects.
 * @param value - The value to check.
 * @returns {@code true} if the value has a callable {@code delete} property.
 */
function hasDeleteMethod(value: unknown): value is { delete: (name: string) => void } {
  return isRecord(value) && typeof value.delete === 'function';
}

/**
 * Redacts the password field from login request errors before they
 * propagate to error handlers or logging, preventing credential leakage.
 * @param error - The Axios error to sanitize.
 */
function redactLoginPassword(error: AxiosError): void {
  const requestUrl = error.config?.url ?? '';
  if (!requestUrl.includes(LOGIN_PATH) || error.config?.data == null) {
    return;
  }

  const payload = error.config.data;

  if (typeof payload === 'string') {
    try {
      const parsedPayload: unknown = JSON.parse(payload);
      if (isRecord(parsedPayload) && 'password' in parsedPayload) {
        delete parsedPayload.password;
        error.config.data = JSON.stringify(parsedPayload);
      }
    } catch {
      error.config.data = undefined;
    }

    return;
  }

  if (isRecord(payload)) {
    const redactedPayload = { ...payload };

    if ('password' in redactedPayload) {
      delete redactedPayload.password;
      error.config.data = redactedPayload;
    }
  }
}

/**
 * Pre-configured Axios instance used by all service modules.
 * Sends credentials (cookies) with every request.
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  if (config.data instanceof FormData && config.headers) {
    if (hasDeleteMethod(config.headers)) {
      config.headers.delete('Content-Type');
    } else if (isRecord(config.headers)) {
      delete config.headers['Content-Type'];
    }
  }

  return config;
});

// Interceptor: redact login password from Axios error config data before propagation/logging.
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    redactLoginPassword(error);

    const originalRequest = error.config;
    const requestUrl = originalRequest?.url ?? '';
    const responseStatus = error.response?.status;
    const hasRetried = originalRequest != null && retriedRequests.has(originalRequest);
    const isAuthExcludedPath =
      requestUrl.includes(LOGIN_PATH) ||
      requestUrl.includes(REFRESH_PATH) ||
      requestUrl.includes(LOGOUT_PATH) ||
      requestUrl.includes(VALIDATE_PATH);

    if (responseStatus !== 401 || !originalRequest || hasRetried || isAuthExcludedPath) {
      throw error;
    }

    retriedRequests.add(originalRequest);

    try {
      refreshPromise ??= apiClient
        .post<RefreshResponse>(REFRESH_PATH)
        .then(() => undefined)
        .finally(() => {
          refreshPromise = null;
        });

      await refreshPromise;
      return apiClient(originalRequest);
    } catch {
      useAuthStore.getState().clearAuth();
    }

    throw error;
  }
);

export default apiClient;
