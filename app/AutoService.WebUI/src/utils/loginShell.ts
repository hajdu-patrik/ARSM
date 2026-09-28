/** Handoff helper for index.html's static pre-React copy of the loading splash on /login. */

/** Id of the static splash copy that index.html renders outside `#root`. */
const LOGIN_SHELL_ID = 'login-shell';

/** Removes index.html's static splash copy; idempotent no-op once gone or never revealed. */
export function removeLoginShell(): void {
  document.getElementById(LOGIN_SHELL_ID)?.remove();
}
