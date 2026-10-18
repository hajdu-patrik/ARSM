/** Query options of the admin mechanic roster reads: the paged admin page and the full option list of the scheduler. */

import type { PagedQuery } from '../../types/common/pagination.types';
import { ADMIN_COMPANY_PROFILE_STALE_TIME_MS, ADMIN_MECHANICS_STALE_TIME_MS } from '../cache/cache-policy';
import { queryKeys, type AuthQueryScope } from '../cache/queryKeys';
import { adminService } from '../admin/admin.service';
import { scopedQueryOptions } from './scopedQueryOptions';

/** Page size of the option list: the server maximum, so one request returns every mechanic. */
const OPTIONS_PAGE_SIZE = 500;

/** Admin read factories; every one takes the scope of useAuthQueryScope() first. */
export const adminQueries = {
  /** One page of the mechanic roster; the previous page stays shown while the next one loads. */
  mechanicsPage: (scope: AuthQueryScope | null, query: PagedQuery) =>
    scopedQueryOptions(
      scope,
      (authScope) => queryKeys.admin.mechanicsPage(authScope, query),
      (request) => adminService.listMechanics(query, request),
      ADMIN_MECHANICS_STALE_TIME_MS,
      true,
    ),
  /** Every registered mechanic as a plain array, for the scheduler selects. */
  mechanicOptions: (scope: AuthQueryScope | null) =>
    scopedQueryOptions(
      scope,
      queryKeys.admin.mechanicOptions,
      async (request) => (await adminService.listMechanics({ page: 1, pageSize: OPTIONS_PAGE_SIZE }, request)).items,
      ADMIN_MECHANICS_STALE_TIME_MS,
    ),
  /** The company letterhead data of the quote PDF. */
  companyProfile: (scope: AuthQueryScope | null) =>
    scopedQueryOptions(
      scope,
      queryKeys.admin.companyProfile,
      (request) => adminService.getCompanyProfile(request),
      ADMIN_COMPANY_PROFILE_STALE_TIME_MS,
    ),
};
