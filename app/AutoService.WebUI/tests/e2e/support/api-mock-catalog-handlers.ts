import type { Route } from '@playwright/test';
import type { InstallApiMockOptions } from './api-mocks';
import type { MockApiState } from './test-data';
import { isAuthenticated } from './api-mock-authz';
import { fulfillJson } from './api-mock-response';
import { tryHandlePartRoute } from './api-mock-catalog-parts';
import { tryHandleLaborTypeRoute } from './api-mock-catalog-labor-types';

/** Dispatches `/api/parts` and `/api/labor-types` mock requests (plan F2 catalog). */
export async function tryHandleCatalogRoute(
  route: Route,
  method: string,
  path: string,
  state: MockApiState,
  options: InstallApiMockOptions,
): Promise<boolean> {
  if (!isAuthenticated(options)) {
    await fulfillJson(route, { detail: 'Unauthorized' }, 401);
    return true;
  }

  if (await tryHandlePartRoute(route, method, path, state)) {
    return true;
  }

  return tryHandleLaborTypeRoute(route, method, path, state);
}
