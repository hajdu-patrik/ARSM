import type { Route } from '@playwright/test';

/** A failure a spec arms for one route key: an HTTP error answer, or a dropped connection. */
export interface MockFailure {
  readonly status?: number;
  readonly body?: unknown;
  /** Extra response headers, for example `Retry-After`. */
  readonly headers?: Readonly<Record<string, string>>;
  /** Fail every request of the route instead of only the next one. */
  readonly repeat?: boolean;
  /** Drop the connection (a network failure) instead of answering. */
  readonly abort?: boolean;
}

/** Answers the route with a JSON body, the status and the CORS headers. */
export async function fulfillJson(
  route: Route,
  body: unknown,
  status = 200,
  extraHeaders: Readonly<Record<string, string>> = {},
): Promise<void> {
  await route.fulfill({
    status,
    contentType: 'application/json',
    headers: { ...corsHeaders(route), ...extraHeaders },
    body: JSON.stringify(body),
  });
}

export async function fulfillNoContent(route: Route): Promise<void> {
  await route.fulfill({ status: 204, headers: corsHeaders(route) });
}

/** Answers a missing or stale concurrency version the way the API does: 422 for a missing one, 409 with the
 * entity's machine-readable conflict code for a stale one. Returns true when it answered. */
export async function rejectStaleVersion(
  route: Route,
  currentVersion: number,
  submittedVersion: number | undefined,
  conflictCode: string,
): Promise<boolean> {
  if (!submittedVersion) {
    await fulfillJson(route, { detail: 'Version is required.' }, 422);
    return true;
  }

  if (submittedVersion !== currentVersion) {
    await fulfillJson(route, { code: conflictCode }, 409);
    return true;
  }

  return false;
}

export function corsHeaders(route: Route): Record<string, string> {
  const origin = route.request().headers().origin ?? 'https://localhost:5173';

  return {
    'access-control-allow-origin': origin,
    'access-control-allow-credentials': 'true',
    'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'access-control-allow-headers': 'content-type,authorization',
    'access-control-expose-headers': 'retry-after',
  };
}
