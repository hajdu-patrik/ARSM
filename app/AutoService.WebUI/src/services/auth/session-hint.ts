/** Local hint that a server-side auth cookie session may exist, so a cold start can skip a pointless validate call. */

import { readStorage, removeStorage, writeStorage } from '../../utils/safeStorage';

/** localStorage key indicating that a server-side auth cookie session may exist. */
const SESSION_HINT_KEY = 'autoservice-session-hint';

/** Records that auth session restoration should call the backend on app boot. */
export function setAuthSessionHint(): void {
  writeStorage('local', SESSION_HINT_KEY, '1');
}

/** Clears the local auth-session hint without touching server-side cookies. */
export function clearAuthSessionHint(): void {
  removeStorage('local', SESSION_HINT_KEY);
}

/** Returns true when this browser has a local auth-session hint. */
export function hasAuthSessionHint(): boolean {
  return readStorage('local', SESSION_HINT_KEY) === '1';
}
