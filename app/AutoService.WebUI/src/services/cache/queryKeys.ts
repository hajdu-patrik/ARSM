/** Query-key factory for private, authenticated WebUI API data. */

import type { QueryKey } from '@tanstack/react-query';
import type { AuthUser } from '../../types/auth/login.types';

const QUERY_KEY_ROOT = 'arsm';
const QUERY_KEY_SCOPE = 'private-data';
const QUERY_KEY_VERSION = 'v1';

/** Authenticated query namespace segment that prevents persisted private data from crossing users or roles. */
export type AuthQueryScope = readonly [
  typeof QUERY_KEY_ROOT,
  typeof QUERY_KEY_SCOPE,
  typeof QUERY_KEY_VERSION,
  'person',
  number,
  'admin' | 'staff',
];

/**
 * Builds the authenticated query scope for the current user.
 * @param user Current auth user from the auth store.
 * @returns A private query scope, or {@code null} when no user is authenticated.
 */
export function getAuthQueryScope(user: AuthUser | null): AuthQueryScope | null {
  if (!user) {
    return null;
  }

  return [QUERY_KEY_ROOT, QUERY_KEY_SCOPE, QUERY_KEY_VERSION, 'person', user.personId, user.isAdmin ? 'admin' : 'staff'];
}

/**
 * Checks whether a query key belongs to the persisted private ARSM namespace.
 * @param queryKey TanStack Query key to inspect before dehydration.
 * @returns {@code true} when the query is safe to persist in the private cache.
 */
export function isPrivateArsmQueryKey(queryKey: QueryKey): boolean {
  return queryKey[0] === QUERY_KEY_ROOT
    && queryKey[1] === QUERY_KEY_SCOPE
    && queryKey[2] === QUERY_KEY_VERSION;
}

/** Canonical query-key factory for authenticated scheduler and customer read models. */
export const queryKeys = {
  scheduler: {
    root: (scope: AuthQueryScope) => [...scope, 'scheduler'] as const,
    today: (scope: AuthQueryScope) => [...scope, 'scheduler', 'today'] as const,
    monthRoot: (scope: AuthQueryScope) => [...scope, 'scheduler', 'month'] as const,
    month: (scope: AuthQueryScope, year: number, month: number) => [
      ...scope,
      'scheduler',
      'month',
      year,
      month,
    ] as const,
  },
  customers: {
    root: (scope: AuthQueryScope) => [...scope, 'customers'] as const,
    list: (scope: AuthQueryScope) => [...scope, 'customers', 'list'] as const,
    vehicles: (scope: AuthQueryScope, customerId: number) => [
      ...scope,
      'customers',
      'vehicles',
      customerId,
    ] as const,
    customerHistory: (scope: AuthQueryScope, customerId: number) => [
      ...scope,
      'customers',
      'history',
      customerId,
    ] as const,
    vehicleHistory: (scope: AuthQueryScope, vehicleId: number) => [
      ...scope,
      'vehicles',
      'history',
      vehicleId,
    ] as const,
  },
};
