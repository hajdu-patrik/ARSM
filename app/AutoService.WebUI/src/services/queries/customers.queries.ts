/** Query options of the customer registry reads: list, vehicles, one vehicle and the two repair histories. */

import { CUSTOMER_HISTORY_STALE_TIME_MS, CUSTOMER_REGISTRY_STALE_TIME_MS } from '../cache/cache-policy';
import { queryKeys, type AuthQueryScope } from '../cache/queryKeys';
import { customerRegistryService } from '../customers/customer-registry.service';
import { scopedQueryOptions } from './scopedQueryOptions';

/** Customer read factories; every one takes the scope of useAuthQueryScope() first. */
export const customersQueries = {
  /** All customers. */
  list: (scope: AuthQueryScope | null) =>
    scopedQueryOptions(
      scope,
      queryKeys.customers.list,
      (request) => customerRegistryService.listCustomers(request),
      CUSTOMER_REGISTRY_STALE_TIME_MS,
    ),

  /** The vehicles of one customer. */
  vehicles: (scope: AuthQueryScope | null, customerId: number) =>
    scopedQueryOptions(
      scope,
      (authScope) => queryKeys.customers.vehicles(authScope, customerId),
      (request) => customerRegistryService.listVehicles(customerId, request),
      CUSTOMER_REGISTRY_STALE_TIME_MS,
    ),

  /** One vehicle with its owner summary. */
  vehicle: (scope: AuthQueryScope | null, vehicleId: number) =>
    scopedQueryOptions(
      scope,
      (authScope) => queryKeys.customers.vehicle(authScope, vehicleId),
      (request) => customerRegistryService.getVehicle(vehicleId, request),
      CUSTOMER_REGISTRY_STALE_TIME_MS,
    ),

  /** The appointment history of one customer in server order (ascending); sort locally for newest first. */
  customerHistory: (scope: AuthQueryScope | null, customerId: number) =>
    scopedQueryOptions(
      scope,
      (authScope) => queryKeys.customers.customerHistory(authScope, customerId),
      (request) => customerRegistryService.getCustomerHistory(customerId, false, request),
      CUSTOMER_HISTORY_STALE_TIME_MS,
    ),

  /** The appointment history of one vehicle in server order (ascending); sort locally for newest first. */
  vehicleHistory: (scope: AuthQueryScope | null, vehicleId: number) =>
    scopedQueryOptions(
      scope,
      (authScope) => queryKeys.customers.vehicleHistory(authScope, vehicleId),
      (request) => customerRegistryService.getVehicleHistory(vehicleId, false, request),
      CUSTOMER_HISTORY_STALE_TIME_MS,
    ),
};
