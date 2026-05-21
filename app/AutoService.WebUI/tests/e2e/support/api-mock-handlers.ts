import type { Route } from '@playwright/test';
import type { InstallApiMockOptions } from './api-mocks';
import type { MockApiState } from './test-data';
import { tryHandleAdminRoute } from './api-mock-admin-handlers';
import { tryHandleAuthRoute, tryHandleProfileRoute } from './api-mock-auth-profile-handlers';
import { tryHandleAppointmentRoute, tryHandleCustomerRoute } from './api-mock-customer-appointment-handlers';
import { fulfillJson, fulfillNoContent } from './api-mock-response';

function normalizeApiPath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

export async function handleApiRoute(
  route: Route,
  state: MockApiState,
  options: InstallApiMockOptions,
): Promise<void> {
  const request = route.request();
  const url = new URL(request.url());
  const method = request.method().toUpperCase();
  const path = normalizeApiPath(url.pathname);

  if (method === 'OPTIONS') {
    await fulfillNoContent(route);
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
