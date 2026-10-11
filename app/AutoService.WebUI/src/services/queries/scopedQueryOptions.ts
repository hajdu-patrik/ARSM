/** Shared builder of the scoped read queryOptions: key, queryFn and stale time in one place, and a
 * parked query (skipToken) while nobody is signed in. */

import { queryOptions, skipToken, type QueryFunctionContext, type QueryKey } from '@tanstack/react-query';
import { SIGNED_OUT_QUERY_KEY, type AuthQueryScope } from '../cache/queryKeys';
import type { SilentRequestOptions } from '../http/request-options';

/** A refetch of data that is already cached is a silent background refresh: its failure must not redirect to /500. */
function toRequestOptions({ client, queryKey }: QueryFunctionContext): SilentRequestOptions {
  return { skipErrorRedirect: client.getQueryData(queryKey) !== undefined };
}

/** Builds the queryOptions of one authenticated read: `buildKey` derives the key from the scope and `fetchData`
 * calls the service. Without a scope the query is parked with skipToken, so it never fetches or persists. */
export function scopedQueryOptions<TData>(
  scope: AuthQueryScope | null,
  buildKey: (authScope: AuthQueryScope) => QueryKey,
  fetchData: (request: SilentRequestOptions) => Promise<TData>,
  staleTime: number,
) {
  return queryOptions({
    queryKey: scope === null ? SIGNED_OUT_QUERY_KEY : buildKey(scope),
    queryFn: scope === null ? skipToken : (context: QueryFunctionContext) => fetchData(toRequestOptions(context)),
    staleTime,
  });
}
