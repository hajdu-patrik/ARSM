/** localStorage key indicating that a server-side auth cookie session may exist. */
const SESSION_HINT_KEY = 'autoservice-session-hint';

/** Records that auth session restoration should call the backend on app boot. */
export function setAuthSessionHint(): void {
  localStorage.setItem(SESSION_HINT_KEY, '1');
}

/** Clears the local auth-session hint without touching server-side cookies. */
export function clearAuthSessionHint(): void {
  localStorage.removeItem(SESSION_HINT_KEY);
}

/** Returns true when this browser has a local auth-session hint. */
export function hasAuthSessionHint(): boolean {
  return localStorage.getItem(SESSION_HINT_KEY) === '1';
}