/** Query options of the part and labor-type catalog reads; only the option lists are persisted across reloads. */

import type { PagedQuery } from '../../types/common/pagination.types';
import { CATALOG_STALE_TIME_MS } from '../cache/cache-policy';
import { queryKeys, type AuthQueryScope } from '../cache/queryKeys';
import { laborTypeService } from '../catalog/labor-type.service';
import { partService } from '../catalog/part.service';
import { scopedQueryOptions } from './scopedQueryOptions';

/** Page size of the full option lists the Quotes editor pickers read. */
const OPTIONS_PAGE_SIZE = 500;

const OPTIONS_QUERY: PagedQuery = { page: 1, pageSize: OPTIONS_PAGE_SIZE };

/** Catalog read factories; every one takes the scope of useAuthQueryScope() first. */
export const catalogQueries = {
  /** One page of parts for the Inventory tab; the previous page stays visible while the next loads. */
  partsPage: (scope: AuthQueryScope | null, query: PagedQuery) =>
    scopedQueryOptions(
      scope,
      (authScope) => queryKeys.catalog.partsPage(authScope, query),
      (request) => partService.listParts(query, request),
      CATALOG_STALE_TIME_MS,
      true,
    ),

  /** One page of labor types for the Inventory tab; the previous page stays visible while the next loads. */
  laborTypesPage: (scope: AuthQueryScope | null, query: PagedQuery) =>
    scopedQueryOptions(
      scope,
      (authScope) => queryKeys.catalog.laborTypesPage(authScope, query),
      (request) => laborTypeService.listLaborTypes(query, request),
      CATALOG_STALE_TIME_MS,
      true,
    ),

  /** Every part (first 500) as a plain array, for the Quotes editor picker. */
  partOptions: (scope: AuthQueryScope | null) =>
    scopedQueryOptions(
      scope,
      queryKeys.catalog.partOptions,
      async (request) => (await partService.listParts(OPTIONS_QUERY, request)).items,
      CATALOG_STALE_TIME_MS,
    ),

  /** Every labor type (first 500) as a plain array, for the Quotes editor picker. */
  laborTypeOptions: (scope: AuthQueryScope | null) =>
    scopedQueryOptions(
      scope,
      queryKeys.catalog.laborTypeOptions,
      async (request) => (await laborTypeService.listLaborTypes(OPTIONS_QUERY, request)).items,
      CATALOG_STALE_TIME_MS,
    ),
};
