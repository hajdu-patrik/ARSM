import type { Route } from '@playwright/test';
import type { InstallApiMockOptions } from './api-mocks';
import type { MockApiState } from './test-data';
import { PROTECTED_DEMO_MECHANIC_EMAILS } from './test-data';
import { isAuthenticated } from './api-mock-authz';
import { fulfillJson, fulfillNoContent } from './api-mock-response';

export async function tryHandleAdminRoute(
  route: Route,
  method: string,
  path: string,
  options: InstallApiMockOptions,
  state: MockApiState,
): Promise<boolean> {
  if (!path.startsWith('/api/admin/')) {
    return false;
  }

  if (!isAuthenticated(options)) {
    await fulfillJson(route, { detail: 'Unauthorized' }, 401);
    return true;
  }

  if (!options.isAdmin) {
    await fulfillJson(route, { detail: 'Forbidden' }, 403);
    return true;
  }

  if (path === '/api/admin/mechanics' && method === 'GET') {
    await fulfillJson(route, state.mechanics);
    return true;
  }

  const mechanicDeleteMatch = /^\/api\/admin\/mechanics\/(\d+)$/.exec(path);
  if (mechanicDeleteMatch && method === 'DELETE') {
    const personId = Number(mechanicDeleteMatch[1]);
    const mechanicIndex = state.mechanics.findIndex((mechanic) => mechanic.personId === personId);
    if (mechanicIndex < 0) {
      await fulfillJson(route, { detail: 'Mechanic not found.' }, 404);
      return true;
    }

    const target = state.mechanics[mechanicIndex];
    if (PROTECTED_DEMO_MECHANIC_EMAILS.has(target.email.toLowerCase())) {
      await fulfillJson(route, { detail: 'Cannot delete demo mechanic records used by seeded test data.' }, 422);
      return true;
    }

    if (target.isAdmin) {
      await fulfillJson(route, { detail: 'Cannot delete this mechanic because they are the last remaining mechanic.' }, 422);
      return true;
    }

    const deletableCount = state.mechanics.filter((mechanic) => !mechanic.isAdmin).length;
    if (deletableCount <= 1) {
      await fulfillJson(route, { detail: 'Cannot delete this mechanic because they are the last remaining mechanic.' }, 422);
      return true;
    }

    state.mechanics.splice(mechanicIndex, 1);
    await fulfillNoContent(route);
    return true;
  }

  return false;
}
