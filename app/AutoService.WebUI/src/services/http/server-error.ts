/** The handled server-error path: the /500 page, which reloads the return target after a countdown. */

import axios from 'axios';

const SERVER_ERROR_PATH = '/500';

/** HTTP statuses that mean the server is failing or unavailable rather than rejecting the request. */
const SERVER_ERROR_STATUSES: ReadonlySet<number> = new Set([500, 502, 503, 504]);

/** True for the HTTP statuses that take the handled server-error path. */
export function isServerErrorStatus(status: number | undefined): boolean {
  return status !== undefined && SERVER_ERROR_STATUSES.has(status);
}

/** True for a failure that a later retry can fix: a timeout, a network error or a server-error status. */
export function isTransientRequestFailure(error: unknown): boolean {
  if (!axios.isAxiosError(error)) {
    return false;
  }

  if (error.response === undefined) {
    return !axios.isCancel(error);
  }

  return isServerErrorStatus(error.response.status);
}

/** Sends the browser to the /500 page with the current location as the return target; no-op there. */
export function redirectToServerError(): void {
  const { pathname, search, hash } = globalThis.location;
  if (pathname === SERVER_ERROR_PATH) {
    return;
  }

  const returnTo = `${pathname}${search}${hash}`;
  globalThis.location.assign(`${SERVER_ERROR_PATH}?returnTo=${encodeURIComponent(returnTo)}`);
}
