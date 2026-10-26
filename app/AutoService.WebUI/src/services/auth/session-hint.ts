/** Local hint that a server-side auth cookie session may exist, so a cold start can skip a pointless validate call. */

import { readStorage, removeStorage, writeStorage } from '../../utils/safeStorage';
import { AUTH_SESSION_HINT_KEY } from '../../utils/browserStorageKeys';

export function setAuthSessionHint(): void {
  writeStorage('local', AUTH_SESSION_HINT_KEY, '1');
}

/** Clears the local auth-session hint without touching server-side cookies. */
export function clearAuthSessionHint(): void {
  removeStorage('local', AUTH_SESSION_HINT_KEY);
}

export function hasAuthSessionHint(): boolean {
  return readStorage('local', AUTH_SESSION_HINT_KEY) === '1';
}
