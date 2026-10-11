/** Query options of the admin mechanic roster read, shared by the scheduler and the admin page. */

import { ADMIN_MECHANICS_STALE_TIME_MS } from '../cache/cache-policy';
import { queryKeys, type AuthQueryScope } from '../cache/queryKeys';
import { adminService } from '../admin/admin.service';
import { scopedQueryOptions } from './scopedQueryOptions';

/** Admin read factories; every one takes the scope of useAuthQueryScope() first. */
export const adminQueries = {
  /** All registered mechanics. */
  mechanics: (scope: AuthQueryScope | null) =>
    scopedQueryOptions(
      scope,
      queryKeys.admin.mechanics,
      (request) => adminService.listMechanics(request),
      ADMIN_MECHANICS_STALE_TIME_MS,
    ),
};
