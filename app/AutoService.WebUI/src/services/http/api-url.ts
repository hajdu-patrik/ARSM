/** API base URL from {@code VITE_API_URL}; it has no fallback on purpose (see WebUI CLAUDE.md). */

const configuredApiUrl: unknown = import.meta.env.VITE_API_URL;

if (typeof configuredApiUrl !== 'string' || configuredApiUrl === '') {
  throw new Error('VITE_API_URL is not configured. Set it via AppHost or .env.development.');
}

/** Base URL of the API, shared by the axios client and by direct resource URLs (pictures, SSE). */
export const API_URL: string = configuredApiUrl;
