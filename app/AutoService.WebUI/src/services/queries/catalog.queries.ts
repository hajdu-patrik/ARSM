/** Query options of the part and labor-type catalog reads; the only queries persisted across reloads. */

import { CATALOG_STALE_TIME_MS } from '../cache/cache-policy';
import { queryKeys, type AuthQueryScope } from '../cache/queryKeys';
import { laborTypeService } from '../catalog/labor-type.service';
import { partService } from '../catalog/part.service';
import { scopedQueryOptions } from './scopedQueryOptions';

/** Catalog read factories; every one takes the scope of useAuthQueryScope() first. */
export const catalogQueries = {
  /** All parts. */
  parts: (scope: AuthQueryScope | null) =>
    scopedQueryOptions(
      scope,
      queryKeys.catalog.parts,
      (request) => partService.listParts(request),
      CATALOG_STALE_TIME_MS,
    ),

  /** All labor types. */
  laborTypes: (scope: AuthQueryScope | null) =>
    scopedQueryOptions(
      scope,
      queryKeys.catalog.laborTypes,
      (request) => laborTypeService.listLaborTypes(request),
      CATALOG_STALE_TIME_MS,
    ),
};
