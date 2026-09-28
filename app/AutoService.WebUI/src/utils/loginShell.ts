/**
 * Handoff helper for index.html's static pre-React copy of the loading splash on /login.
 * @module utils/loginShell
 */

/** Id of the static splash copy that index.html renders outside `#root`. */
const LOGIN_SHELL_ID = 'login-shell';

/**
 * Removes index.html's static splash copy. Idempotent: a no-op once the copy is gone
 * or on any page where it was never revealed.
 */
export function removeLoginShell(): void {
  document.getElementById(LOGIN_SHELL_ID)?.remove();
}
