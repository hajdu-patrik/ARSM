import axios from 'axios';
import type { AxiosError, AxiosInstance } from 'axios';
import { useAuthStore } from '../store/auth.store';
import type { RefreshResponse } from '../types/login.types';

const API_URL = import.meta.env.VITE_API_URL;
const LOGIN_PATH = '/api/auth/login';
const REFRESH_PATH = '/api/auth/refresh';
const LOGOUT_PATH = '/api/auth/logout';
const VALIDATE_PATH = '/api/auth/validate';

if (!API_URL) {
  throw new Error('VITE_API_URL is not configured. Set it via AppHost or .env.development.');
}

type RetryableRequestConfig = NonNullable<AxiosError['config']> & {
  _retry?: boolean;
};

let refreshPromise: Promise<void> | null = null;

function redactLoginPassword(error: AxiosError): void {
  const requestUrl = error.config?.url ?? '';
  if (!requestUrl.includes(LOGIN_PATH) || error.config?.data == null) {
    return;
  }

  const payload = error.config.data;

  if (typeof payload === 'string') {
    try {
      const parsedPayload = JSON.parse(payload) as Record<string, unknown>;
      if ('password' in parsedPayload) {
        delete parsedPayload.password;
        error.config.data = JSON.stringify(parsedPayload);
      }
    } catch {
      error.config.data = undefined;
    }

    return;
  }

  if (typeof payload === 'object' && payload !== null) {
    const redactedPayload = {
      ...(payload as Record<string, unknown>),
    };

    if ('password' in redactedPayload) {
      delete redactedPayload.password;
      error.config.data = redactedPayload;
    }
  }
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  if (config.data instanceof FormData && config.headers) {
    if (typeof (config.headers as { delete?: (name: string) => void }).delete === 'function') {
      (config.headers as { delete: (name: string) => void }).delete('Content-Type');
    } else {
      delete (config.headers as Record<string, unknown>)['Content-Type'];
    }
  }

  return config;
});

// Interceptor: redact login password from Axios error config data before propagation/logging.
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    redactLoginPassword(error);

    const originalRequest = error.config as RetryableRequestConfig | undefined;
    const requestUrl = originalRequest?.url ?? '';
    const responseStatus = error.response?.status;
    const isAuthExcludedPath =
      requestUrl.includes(LOGIN_PATH) ||
      requestUrl.includes(REFRESH_PATH) ||
      requestUrl.includes(LOGOUT_PATH) ||
      requestUrl.includes(VALIDATE_PATH);

    if (responseStatus !== 401 || !originalRequest || originalRequest._retry || isAuthExcludedPath) {
      throw error;
    }

    originalRequest._retry = true;

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
