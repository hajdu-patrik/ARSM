/**
 * CSRF double-submit cookie reader.
 *
 * The API sets a non-HttpOnly {@code autoservice_csrf} cookie on login, refresh and password change,
 * and requires every unsafe (POST/PUT/PATCH/DELETE) request that carries the auth cookie to echo its
 * value back as the {@code X-CSRF-Token} header.
 *
 * Cookies are scoped by host only; the port is not part of that scope. In development the WebUI
 * (`https://localhost:5173`) and the API (`https://localhost:5200`) are cross-origin for fetch/XHR and
 * CORS purposes (origin comparison *does* include the port), yet both share the `localhost` host, so a
 * non-HttpOnly cookie the API sets is still visible to `document.cookie` read from the WebUI origin.
 * In production both are served from the same site for the same reason. This is what makes the
 * double-submit pattern work across the dev-mode origin split.
 *
 * This module only reads the token back out of the cookie jar for the {@code apiClient} request
 * interceptor to echo as a header; it never logs the value or exposes it anywhere else.
 * @module services/http/csrf-token
 */

/** Name of the non-HttpOnly cookie the API sets with the CSRF double-submit token. */
const CSRF_COOKIE_NAME = 'autoservice_csrf';

/**
 * Reads the current CSRF double-submit token out of the browser's cookie jar.
 *
 * The token is a base64url string (RFC 4648 §5), which contains no character that requires percent
 * encoding, so the raw cookie substring is returned as-is — it is exactly the value the server compares
 * the {@code X-CSRF-Token} header against.
 * @returns The {@code autoservice_csrf} cookie value, or {@code null} when the cookie is not set.
 */
export function readCsrfCookie(): string | null {
  if (!document.cookie) {
    return null;
  }

  for (const cookiePair of document.cookie.split('; ')) {
    const separatorIndex = cookiePair.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    if (cookiePair.slice(0, separatorIndex) === CSRF_COOKIE_NAME) {
      return cookiePair.slice(separatorIndex + 1);
    }
  }

  return null;
}
