/** Reads the non-HttpOnly {@code autoservice_csrf} cookie so unsafe requests can echo it as the
 * {@code X-CSRF-Token} header; cookies are host-scoped (not port-scoped), so this works across the dev cross-origin split. */

/** Name of the non-HttpOnly cookie the API sets with the CSRF double-submit token. */
const CSRF_COOKIE_NAME = 'autoservice_csrf';

/** Reads the {@code autoservice_csrf} cookie value as-is (base64url needs no percent-decoding), or null if unset. */
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
