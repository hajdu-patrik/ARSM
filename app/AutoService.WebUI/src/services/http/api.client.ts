/** Axios client for API calls: base URL from `VITE_API_URL` with no fallback (see WebUI CLAUDE.md), plus CSRF header
 * attachment, the single-flight (also cross-tab) 401 refresh-and-retry and the required-password-change flag. */

import axios from 'axios';
import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../../store/auth.store';
import { clearAuthSessionHint } from '../auth/session-hint';
import { API_URL } from './api-url';
import { readCsrfCookie } from './csrf-token';
import { hasErrorCode } from './error-code';
import { isRecord } from './record-guard';
import type { SilentRequestOptions } from './request-options';
import { isServerErrorStatus, redirectToServerError } from './server-error';

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Opts a background/silent request out of the global server-error redirect to /500; the error still propagates. */
    skipErrorRedirect?: boolean | undefined;
  }
}

/** Auth endpoint paths excluded from the automatic refresh retry. */
const LOGIN_PATH = '/api/auth/login';
const REFRESH_PATH = '/api/auth/refresh';
const LOGOUT_PATH = '/api/auth/logout';
const VALIDATE_PATH = '/api/auth/validate';
const REFRESH_EXCLUDED_PATHS = [LOGIN_PATH, REFRESH_PATH, LOGOUT_PATH, VALIDATE_PATH];

/** Request header that must echo the `__Host-autoservice_csrf` cookie on unsafe requests. */
const CSRF_HEADER_NAME = 'X-CSRF-Token';

/** HTTP methods the CSRF header attaches to; GET/HEAD/OPTIONS are excluded to avoid a needless CORS preflight. */
const CSRF_PROTECTED_METHODS = new Set(['post', 'put', 'patch', 'delete']);

/** A request that takes longer than this fails with a timeout error instead of hanging. */
const REQUEST_TIMEOUT_MS = 30_000;

/** Name of the Web Lock that lets one tab at a time refresh the session of this origin. */
const REFRESH_LOCK_NAME = 'arsm-session-refresh';

/** Code of the 403 that every request except the password change gets while a temporary password is still set. */
const PASSWORD_CHANGE_REQUIRED_CODE = 'password_change_required';

/** In-flight refresh promise for single-flight deduplication within this tab. */
let refreshPromise: Promise<void> | null = null;

/** Tracks requests that have already been retried after a 401 to prevent infinite loops. */
const retriedRequests = new WeakSet();

/** Drops the password from a JSON string body; a body that is not valid JSON is discarded entirely. */
function redactSerializedPayload(payload: string): string | undefined {
  try {
    const parsedPayload: unknown = JSON.parse(payload);
    if (isRecord(parsedPayload) && 'password' in parsedPayload) {
      delete parsedPayload.password;
      return JSON.stringify(parsedPayload);
    }

    return payload;
  } catch {
    return undefined;
  }
}

/** Returns a copy of an object body without its password. */
function redactObjectPayload(payload: Record<string, unknown>): Record<string, unknown> {
  if (!('password' in payload)) {
    return payload;
  }

  const redactedPayload = { ...payload };
  delete redactedPayload.password;
  return redactedPayload;
}

/** Redacts the password field from login request errors before they reach handlers or logs. */
function redactLoginPassword(error: AxiosError): void {
  const config = error.config;
  if (config === undefined || !(config.url ?? '').includes(LOGIN_PATH)) {
    return;
  }

  const payload: unknown = config.data;
  if (typeof payload === 'string') {
    config.data = redactSerializedPayload(payload);
  } else if (isRecord(payload)) {
    config.data = redactObjectPayload(payload);
  }
}

/** Attaches the CSRF double-submit header to unsafe requests (cleared when absent); a custom interceptor,
 * not Axios's built-in XSRF support, so a post-401 retry carries the freshly rotated token. */
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

/** Pre-configured Axios instance used by all service modules; sends credentials with every request. */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: REQUEST_TIMEOUT_MS,
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  if (config.data instanceof FormData) {
    // The browser sets the multipart boundary itself; a preset Content-Type would break it.
    config.headers.delete('Content-Type');
  }

  return config;
});

// Interceptor: attach the CSRF double-submit header to unsafe requests (see attachCsrfHeader).
apiClient.interceptors.request.use(attachCsrfHeader);

/** Posts the refresh request, which rotates the session and CSRF cookies. */
async function postRefresh(options: SilentRequestOptions | undefined): Promise<void> {
  await apiClient.post(REFRESH_PATH, undefined, { skipErrorRedirect: options?.skipErrorRedirect });
}

/** Refreshes inside the cross-tab lock: a tab that waited for it skips the call when another tab rotated the CSRF
 * cookie meanwhile, because the tabs share their cookies, so the other tab's refresh already served this one. */
function refreshAcrossTabs(options: SilentRequestOptions | undefined): Promise<void> {
  const csrfTokenBeforeWaiting = readCsrfCookie();

  return navigator.locks.request(REFRESH_LOCK_NAME, async () => {
    if (readCsrfCookie() === csrfTokenBeforeWaiting) {
      await postRefresh(options);
    }
  });
}

/** Refreshes the session once for all concurrent callers of this tab (later ones share the in-flight call)
 * and, where the Web Locks API exists, one tab at a time. The single refresh path of the app. */
export function refreshSession(options?: SilentRequestOptions): Promise<void> {
  refreshPromise ??= ('locks' in navigator ? refreshAcrossTabs(options) : postRefresh(options)).finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

// Interceptor: redact the login password, send server errors to /500, flag a required password change
// and refresh-and-retry a 401 once.
apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) {
      throw error;
    }

    redactLoginPassword(error);

    const originalRequest = error.config;
    const responseStatus = error.response?.status;

    if (isServerErrorStatus(responseStatus) && !originalRequest?.skipErrorRedirect) {
      redirectToServerError();
    }

    if (hasErrorCode(error, 403, PASSWORD_CHANGE_REQUIRED_CODE)) {
      // An admin reset the password during this session: the route guards now move the user to the change-password page.
      useAuthStore.getState().setMustChangePassword(true);
    }

    const requestUrl = originalRequest?.url ?? '';
    const isAuthExcludedPath = REFRESH_EXCLUDED_PATHS.some((path) => requestUrl.includes(path));

    if (
      responseStatus !== 401 ||
      originalRequest === undefined ||
      retriedRequests.has(originalRequest) ||
      isAuthExcludedPath
    ) {
      throw error;
    }

    retriedRequests.add(originalRequest);

    try {
      await refreshSession();
    } catch {
      clearAuthSessionHint();
      useAuthStore.getState().clearAuth();
      throw error;
    }

    return apiClient(originalRequest);
  },
);
