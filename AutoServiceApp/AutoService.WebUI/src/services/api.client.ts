import axios from 'axios';
import type { AxiosError, AxiosInstance } from 'axios';

const API_URL = import.meta.env.VITE_API_URL;
const LOGIN_PATH = '/api/auth/login';

if (!API_URL) {
  throw new Error('VITE_API_URL is not configured. Set it via AppHost or .env.development.');
}

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
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor: attach JWT token to all requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor: redact login password from Axios error config data before propagation/logging.
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    redactLoginPassword(error);
    return Promise.reject(error);
  }
);

export default apiClient;
