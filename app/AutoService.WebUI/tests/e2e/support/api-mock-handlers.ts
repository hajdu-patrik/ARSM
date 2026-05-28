import type { Route } from '@playwright/test';
import type { InstallApiMockOptions } from './api-mocks';
import type { MockApiState } from './test-data';
import { tryHandleAdminRoute } from './api-mock-admin-handlers';
import { tryHandleAuthRoute, tryHandleProfileRoute } from './api-mock-auth-profile-handlers';
import { tryHandleAppointmentRoute, tryHandleCustomerRoute } from './api-mock-customer-appointment-handlers';
import { fulfillJson, fulfillNoContent } from './api-mock-response';

const unauthorizedOnceHits = new WeakMap<InstallApiMockOptions, Set<string>>();

function normalizeApiPath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

/** Dispatches one mocked API request to the matching domain handler. */
export async function handleApiRoute(
  route: Route,
  state: MockApiState,
  options: InstallApiMockOptions,
): Promise<void> {
  const request = route.request();
  const url = new URL(request.url());
  const method = request.method().toUpperCase();
  const path = normalizeApiPath(url.pathname);
  const routeKey = `${method} ${path}`;

  options.routeCallLog?.push(routeKey);

  if (method === 'OPTIONS') {
    await fulfillNoContent(route);
    return;
  }

  if (shouldRejectOnce(options, routeKey)) {
    await fulfillJson(route, { detail: 'Unauthorized' }, 401);
    return;
  }

  if (await tryHandleAuthRoute(route, method, path, options, state)) {
    return;
  }

  if (await tryHandleProfileRoute(route, method, path, options, state)) {
    return;
  }

  if (await tryHandleAdminRoute(route, method, path, options, state)) {
    return;
  }

  if (await tryHandleCustomerRoute(route, method, path, url, state, options)) {
    return;
  }

  if (await tryHandleAppointmentRoute(route, method, path, state, options)) {
    return;
  }

  await fulfillJson(route, { detail: `Unhandled mock route: ${method} ${path}` }, 404);
}

/** Returns true once for configured route keys so refresh/retry tests stay deterministic. */
function shouldRejectOnce(options: InstallApiMockOptions, routeKey: string): boolean {
  if (!options.unauthorizedOnceRouteKeys?.includes(routeKey)) {
    return false;
  }

  const hits = unauthorizedOnceHits.get(options) ?? new Set<string>();
  unauthorizedOnceHits.set(options, hits);

  if (hits.has(routeKey)) {
    return false;
  }

  hits.add(routeKey);
  return true;
}
