/** Reads the non-HttpOnly `__Host-arsm-csrf-token` cookie so unsafe requests can echo it as the
 * `X-CSRF-Token` header; cookies are host-scoped (not port-scoped), so this works across the dev cross-origin split. */

import { AUTH_CSRF_COOKIE_NAME } from '../../utils/browserStorageKeys';

/** Reads the `__Host-arsm-csrf-token` cookie value as-is (base64url needs no percent-decoding), or null if unset. */
export function readCsrfCookie(): string | null {
  if (!document.cookie) {
    return null;
  }

  for (const cookiePair of document.cookie.split('; ')) {
    const separatorIndex = cookiePair.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    if (cookiePair.slice(0, separatorIndex) === AUTH_CSRF_COOKIE_NAME) {
      return cookiePair.slice(separatorIndex + 1);
    }
  }

  return null;
}
