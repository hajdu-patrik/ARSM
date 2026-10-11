import { useCallback } from 'react';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { queryKeys, type AuthQueryScope } from '../../../services/cache/queryKeys';
import { useAuthQueryScope } from '../../../services/queries/useAuthQueryScope';

/** Derives the query keys one mutation has to refresh from the signed-in scope. */
type RefreshKeys = (scope: AuthQueryScope) => readonly QueryKey[];

/** Builds the cache refreshers the customer and vehicle mutations call after a successful write. Each marks the
 * reads that write can make stale and resolves once the mounted ones refetched, so a closing modal never shows old data. */
export function useCustomersListMutations() {
  const queryClient = useQueryClient();
  const scope = useAuthQueryScope();

  const refresh = useCallback(async (buildKeys: RefreshKeys) => {
    if (scope === null) {
      return;
    }

    await Promise.all(buildKeys(scope).map((queryKey) => queryClient.invalidateQueries({ queryKey })));
  }, [queryClient, scope]);

  const refreshAfterCustomerCreated = useCallback(() => refresh((authScope) => [
    queryKeys.customers.list(authScope),
  ]), [refresh]);

  const refreshAfterCustomerUpdated = useCallback((customerId: number) => refresh((authScope) => [
    queryKeys.customers.list(authScope),
    queryKeys.customers.vehicles(authScope, customerId),
  ]), [refresh]);

  // The API deletes a customer's vehicles with it, and a vehicle's quotes with the vehicle.
  const refreshAfterCustomerDeleted = useCallback(() => refresh((authScope) => [
    queryKeys.customers.list(authScope),
    queryKeys.scheduler.root(authScope),
    queryKeys.quotes.root(authScope),
    queryKeys.companyResults.root(authScope),
  ]), [refresh]);

  const refreshAfterVehicleCreated = useCallback((customerId: number) => refresh((authScope) => [
    queryKeys.customers.list(authScope),
    queryKeys.customers.vehicles(authScope, customerId),
  ]), [refresh]);

  const refreshAfterVehicleUpdated = useCallback((customerId: number, vehicleId: number) => refresh((authScope) => [
    queryKeys.customers.list(authScope),
    queryKeys.customers.vehicles(authScope, customerId),
    queryKeys.customers.vehicle(authScope, vehicleId),
    queryKeys.customers.customerHistory(authScope, customerId),
    queryKeys.customers.vehicleHistory(authScope, vehicleId),
    queryKeys.scheduler.root(authScope),
  ]), [refresh]);

  // The vehicle's quotes go with it, so the Quotes list and the revenue report must not keep them.
  const refreshAfterVehicleDeleted = useCallback((customerId: number) => refresh((authScope) => [
    queryKeys.customers.list(authScope),
    queryKeys.customers.vehicles(authScope, customerId),
    queryKeys.customers.customerHistory(authScope, customerId),
    queryKeys.scheduler.root(authScope),
    queryKeys.quotes.root(authScope),
    queryKeys.companyResults.root(authScope),
  ]), [refresh]);

  return {
    refreshAfterCustomerCreated,
    refreshAfterCustomerUpdated,
    refreshAfterCustomerDeleted,
    refreshAfterVehicleCreated,
    refreshAfterVehicleUpdated,
    refreshAfterVehicleDeleted,
  };
}
