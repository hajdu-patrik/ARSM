/**
 * Configured Axios HTTP client for API communication.
 *
 * Reads the base URL from {@code VITE_API_URL} (no hardcoded fallback).
 * Includes request interceptors for {@code FormData} content-type handling and for attaching the CSRF
 * double-submit header ({@code X-CSRF-Token}, see {@link readCsrfCookie}) to unsafe requests, and a
 * response interceptor for automatic {@code 401} token refresh with single-flight deduplication and
 * login password redaction.
 * @module services/http/api.client
 */

import axios from 'axios';
import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../../store/auth.store';
import { clearAuthSessionHint } from '../auth/session-hint';
import { readCsrfCookie } from './csrf-token';

declare module 'axios' {
  interface AxiosRequestConfig {
    /**
     * Opts a background/silent request (session restore, live-update reconnect, polling
     * refresh) out of the global {@code 500 -> /500} redirect; the error still propagates
     * normally so the caller's own handling still runs.
     */
    skipErrorRedirect?: boolean;
  }
}

/** Base API URL read from environment configuration. */
const API_URL = import.meta.env.VITE_API_URL;

/** Auth endpoint paths excluded from the automatic refresh retry. */
const LOGIN_PATH = '/api/auth/login';
const REFRESH_PATH = '/api/auth/refresh';
const LOGOUT_PATH = '/api/auth/logout';
const VALIDATE_PATH = '/api/auth/validate';
const SERVER_ERROR_PATH = '/500';

/** Request header that must echo the {@code autoservice_csrf} cookie on unsafe requests. */
const CSRF_HEADER_NAME = 'X-CSRF-Token';

/**
 * HTTP methods the CSRF double-submit header is attached to. GET/HEAD/OPTIONS never receive it: they
 * are safe methods the API does not require it on, and adding a custom header to every cross-origin
 * GET would force an otherwise-unnecessary CORS preflight.
 */
const CSRF_PROTECTED_METHODS = new Set(['post', 'put', 'patch', 'delete']);

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
 * Attaches the CSRF double-submit header ({@code X-CSRF-Token}) to unsafe requests, or removes a stale
 * one when the cookie is absent. Safe methods are left untouched (see {@link CSRF_PROTECTED_METHODS}).
 *
 * This is an explicit interceptor rather than Axios's built-in {@code xsrfCookieName} /
 * {@code withXSRFToken} support, because that support also attaches the header to safe methods and its
 * exact behavior differs across Axios versions. Because it runs on every dispatch through the shared
 * {@link apiClient}, it also runs on the 401 -> refresh -> retry flow: once for the refresh POST itself
 * and again when the original request is retried, so the retry always carries the freshly rotated token
 * rather than the one read before refresh.
 * @param config - The outgoing request configuration to decorate.
 * @returns The same configuration, with the CSRF header set or cleared.
 */
function attachCsrfHeader(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
  const method = config.method?.toLowerCase();
  if (!method || !CSRF_PROTECTED_METHODS.has(method)) {
    return config;
  }

  const csrfToken = readCsrfCookie();
  if (csrfToken !== null) {
    config.headers.set(CSRF_HEADER_NAME, csrfToken);
  } else {
    config.headers.delete(CSRF_HEADER_NAME);
  }

  return config;
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

// Interceptor: attach the CSRF double-submit header to unsafe requests (see attachCsrfHeader).
apiClient.interceptors.request.use(attachCsrfHeader);

// Interceptor: redact login password from Axios error config data before propagation/logging.
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    redactLoginPassword(error);

    const originalRequest = error.config;
    const requestUrl = originalRequest?.url ?? '';
    const responseStatus = error.response?.status;

    if (
      responseStatus === 500 &&
      !originalRequest?.skipErrorRedirect &&
      globalThis.location.pathname !== SERVER_ERROR_PATH
    ) {
      const returnTo = `${globalThis.location.pathname}${globalThis.location.search}${globalThis.location.hash}`;
      const target = `${SERVER_ERROR_PATH}?returnTo=${encodeURIComponent(returnTo)}`;
      globalThis.location.assign(target);
    }

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
        .post(REFRESH_PATH)
        .then(() => undefined)
        .finally(() => {
          refreshPromise = null;
        });

      await refreshPromise;
      return apiClient(originalRequest);
    } catch {
      clearAuthSessionHint();
      useAuthStore.getState().clearAuth();
    }

    throw error;
  }
);

export default apiClient;
