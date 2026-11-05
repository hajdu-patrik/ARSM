/** Query options of the customer registry reads: paged list, paged vehicles, one vehicle and the two repair histories. */

import type { PagedQuery } from '../../types/common/pagination.types';
import { CUSTOMER_HISTORY_STALE_TIME_MS, CUSTOMER_REGISTRY_STALE_TIME_MS } from '../cache/cache-policy';
import { queryKeys, type AuthQueryScope } from '../cache/queryKeys';
import { customerRegistryService } from '../customers/customer-registry.service';
import { scopedQueryOptions } from './scopedQueryOptions';

export const customersQueries = {
  /** One page of customers; the previous page stays shown while the next loads. */
  listPage: (scope: AuthQueryScope | null, query: PagedQuery) =>
    scopedQueryOptions(
      scope,
      (authScope) => queryKeys.customers.listPage(authScope, query),
      (request) => customerRegistryService.listCustomers(query, request),
      CUSTOMER_REGISTRY_STALE_TIME_MS,
      true,
    ),

  /** One page of the vehicles of one customer; the previous page stays shown while the next loads. */
  vehiclesPage: (scope: AuthQueryScope | null, customerId: number, query: PagedQuery) =>
    scopedQueryOptions(
      scope,
      (authScope) => queryKeys.customers.vehiclesPage(authScope, customerId, query),
      (request) => customerRegistryService.listVehicles(customerId, query, request),
      CUSTOMER_REGISTRY_STALE_TIME_MS,
      true,
    ),

  /** One vehicle with its owner summary. */
  vehicle: (scope: AuthQueryScope | null, vehicleId: number) =>
    scopedQueryOptions(
      scope,
      (authScope) => queryKeys.customers.vehicle(authScope, vehicleId),
      (request) => customerRegistryService.getVehicle(vehicleId, request),
      CUSTOMER_REGISTRY_STALE_TIME_MS,
    ),

  /** The newest 500 appointments of one customer, cached ascending; sort locally for newest first. */
  customerHistory: (scope: AuthQueryScope | null, customerId: number) =>
    scopedQueryOptions(
      scope,
      (authScope) => queryKeys.customers.customerHistory(authScope, customerId),
      async (request) => (await customerRegistryService.getCustomerHistory(customerId, true, request)).reverse(),
      CUSTOMER_HISTORY_STALE_TIME_MS,
    ),

  /** The newest 500 appointments of one vehicle, cached ascending; sort locally for newest first. */
  vehicleHistory: (scope: AuthQueryScope | null, vehicleId: number) =>
    scopedQueryOptions(
      scope,
      (authScope) => queryKeys.customers.vehicleHistory(authScope, vehicleId),
      async (request) => (await customerRegistryService.getVehicleHistory(vehicleId, true, request)).reverse(),
      CUSTOMER_HISTORY_STALE_TIME_MS,
    ),
};
