import type { Route } from '@playwright/test';
import type { CompanyProfileDto } from '../../../src/types/admin/companyProfile.types';
import type { InstallApiMockOptions } from './api-mocks';
import type { MockApiState } from './test-data';
import { isAuthenticated } from './api-mock-authz';
import { fulfillJson } from './api-mock-response';

const COMPANY_PROFILE_PATH = '/api/admin/company-profile';

/** Dispatches `GET`/`PUT /api/admin/company-profile`: admin only, the saved letterhead is returned trimmed. */
export async function tryHandleCompanyProfileRoute(
  route: Route,
  method: string,
  path: string,
  options: InstallApiMockOptions,
  state: MockApiState,
): Promise<boolean> {
  if (path !== COMPANY_PROFILE_PATH || (method !== 'GET' && method !== 'PUT')) {
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

  if (method === 'PUT') {
    const payload = route.request().postDataJSON() as CompanyProfileDto;
    Object.assign(state.companyProfile, payload);
  }

  await fulfillJson(route, state.companyProfile);
  return true;
}
