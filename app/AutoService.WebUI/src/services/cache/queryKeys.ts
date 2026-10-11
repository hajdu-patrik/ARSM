/** Query-key factory for private, authenticated WebUI API data. */

import type { QueryKey } from '@tanstack/react-query';
import type { AuthUser } from '../../types/auth/login.types';

const QUERY_KEY_ROOT = 'arsm';
const QUERY_KEY_SCOPE = 'private-data';
const QUERY_KEY_VERSION = 'v1';

const CATALOG_SEGMENT = 'catalog';
const PARTS_SEGMENT = 'parts';
const LABOR_TYPES_SEGMENT = 'labor-types';

/** Authenticated query namespace segment that prevents persisted private data from crossing users or roles. */
export type AuthQueryScope = readonly [
  typeof QUERY_KEY_ROOT,
  typeof QUERY_KEY_SCOPE,
  typeof QUERY_KEY_VERSION,
  'person',
  number,
  'admin' | 'staff',
];

/** Number of segments an authenticated scope takes at the start of every private query key. */
const AUTH_SCOPE_LENGTH: AuthQueryScope['length'] = 6;

/** Key of every query observed while nobody is signed in; those run with skipToken, so nothing is fetched or persisted. */
export const SIGNED_OUT_QUERY_KEY = [QUERY_KEY_ROOT, 'signed-out'] as const;

/** Builds the authenticated query scope for the current user, or null when unauthenticated. */
export function getAuthQueryScope(user: AuthUser | null): AuthQueryScope | null {
  if (!user) {
    return null;
  }

  return [QUERY_KEY_ROOT, QUERY_KEY_SCOPE, QUERY_KEY_VERSION, 'person', user.personId, user.isAdmin ? 'admin' : 'staff'];
}

/** Checks whether a query key belongs to the private ARSM namespace. */
export function isPrivateArsmQueryKey(queryKey: QueryKey): boolean {
  return queryKey[0] === QUERY_KEY_ROOT
    && queryKey[1] === QUERY_KEY_SCOPE
    && queryKey[2] === QUERY_KEY_VERSION;
}

/** Checks whether a query key may be persisted across reloads: only the part and labor-type catalog reads,
 * which hold no personal data; every customer, quote, appointment and profile read stays in memory. */
export function isPersistedArsmQueryKey(queryKey: QueryKey): boolean {
  if (!isPrivateArsmQueryKey(queryKey) || queryKey[AUTH_SCOPE_LENGTH] !== CATALOG_SEGMENT) {
    return false;
  }

  const catalogKind = queryKey[AUTH_SCOPE_LENGTH + 1];
  return catalogKind === PARTS_SEGMENT || catalogKind === LABOR_TYPES_SEGMENT;
}

/** Canonical query-key factory for authenticated read models. */
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
    vehicle: (scope: AuthQueryScope, vehicleId: number) => [
      ...scope,
      'customers',
      'vehicle',
      vehicleId,
    ] as const,
    vehicleHistory: (scope: AuthQueryScope, vehicleId: number) => [
      ...scope,
      'customers',
      'vehicle-history',
      vehicleId,
    ] as const,
  },
  catalog: {
    root: (scope: AuthQueryScope) => [...scope, CATALOG_SEGMENT] as const,
    parts: (scope: AuthQueryScope) => [...scope, CATALOG_SEGMENT, PARTS_SEGMENT] as const,
    laborTypes: (scope: AuthQueryScope) => [...scope, CATALOG_SEGMENT, LABOR_TYPES_SEGMENT] as const,
  },
  quotes: {
    root: (scope: AuthQueryScope) => [...scope, 'quotes'] as const,
    list: (scope: AuthQueryScope) => [...scope, 'quotes', 'list'] as const,
    detail: (scope: AuthQueryScope, quoteId: number) => [...scope, 'quotes', 'detail', quoteId] as const,
  },
  companyResults: {
    root: (scope: AuthQueryScope) => [...scope, 'company-results'] as const,
    period: (scope: AuthQueryScope, year: number, month: number | null) => [
      ...scope,
      'company-results',
      year,
      month ?? 'year',
    ] as const,
  },
  profile: {
    me: (scope: AuthQueryScope) => [...scope, 'profile'] as const,
  },
  admin: {
    mechanics: (scope: AuthQueryScope) => [...scope, 'admin', 'mechanics'] as const,
  },
};
