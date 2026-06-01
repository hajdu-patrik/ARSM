import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { useQueryClient, type QueryClient, type QueryKey } from '@tanstack/react-query';
import type { AppointmentDto } from '../../../types/scheduler/scheduler.types';
import type { CustomerListItem, VehicleDetailDto } from '../../../types/customers/customers.types';
import { customerRegistryService } from '../../../services/customers/customer-registry.service';
import {
  CUSTOMER_HISTORY_STALE_TIME_MS,
  CUSTOMER_REGISTRY_STALE_TIME_MS,
  PERSISTED_QUERY_CACHE_MAX_AGE_MS,
} from '../../../services/cache/cache-policy';
import { getAuthQueryScope, queryKeys } from '../../../services/cache/queryKeys';
import { useAuthStore } from '../../../store/auth.store';
import { buildCustomerDisplayName, normalizeSearchValue } from '../helpers';
import type { SortDirection } from '../page.types';
import { applyLoadedVehicleSummary } from './useCustomersListState.helpers';
import { useCustomersListMutations } from './useCustomersListMutations';

/** External dependencies for the customers list-state hook. */
interface UseCustomersListStateParams {
  language: string;
  showErrorToast: (message: string) => void;
}

/**
 * Resolves React set-state payloads so cache synchronization can mirror state updates exactly.
 * @param update Direct state value or updater callback.
 * @param previous Previous state value supplied by React.
 * @returns The next state value.
 */
function resolveStateUpdate<T>(update: SetStateAction<T>, previous: T): T {
  return typeof update === 'function'
    ? (update as (previousValue: T) => T)(previous)
    : update;
}

/**
 * Mirrors record-shaped React state into per-entity query-cache entries and removes stale entries.
 * @param queryClient Shared query client that owns the browser cache.
 * @param previous Previous record state before the React update.
 * @param next Next record state after the React update.
 * @param keyFactory Query-key factory for each numeric record id.
 */
function syncRecordCache<TValue>(
  queryClient: QueryClient,
  previous: Record<number, TValue>,
  next: Record<number, TValue>,
  keyFactory: (id: number) => QueryKey,
): void {
  for (const [rawId, value] of Object.entries(next)) {
    queryClient.setQueryData(keyFactory(Number(rawId)), value);
  }

  for (const rawId of Object.keys(previous)) {
    if (!(rawId in next)) {
      queryClient.removeQueries({ exact: true, queryKey: keyFactory(Number(rawId)) });
    }
  }
}

/**
 * Manages Customers page read-side state: list loading, search/sort, expansion,
 * and on-demand repair history loading for customers and vehicles.
 * @param params Hook dependencies for locale-aware sorting and error surfacing.
 * @returns Stateful values and actions consumed by the Customers page container.
 */
export function useCustomersListState({ language, showErrorToast }: UseCustomersListStateParams) {
  const queryClient = useQueryClient();
  const authUser = useAuthStore((state) => state.user);
  const authScope = useMemo(() => getAuthQueryScope(authUser), [authUser]);

  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [expandedCustomerIds, setExpandedCustomerIds] = useState<Set<number>>(new Set());

  const [vehiclesByCustomerId, setVehiclesByCustomerId] = useState<Record<number, VehicleDetailDto[]>>({});
  const [isLoadingVehiclesByCustomerId, setIsLoadingVehiclesByCustomerId] = useState<Record<number, boolean>>({});

  const [customerHistoryByCustomerId, setCustomerHistoryByCustomerId] = useState<Record<number, AppointmentDto[]>>({});
  const [isLoadingCustomerHistoryByCustomerId, setIsLoadingCustomerHistoryByCustomerId] = useState<Record<number, boolean>>({});
  const [customerHistorySortByCustomerId, setCustomerHistorySortByCustomerId] = useState<Record<number, SortDirection>>({});

  const [vehicleHistoryByVehicleId, setVehicleHistoryByVehicleId] = useState<Record<number, AppointmentDto[]>>({});
  const [isLoadingVehicleHistoryByVehicleId, setIsLoadingVehicleHistoryByVehicleId] = useState<Record<number, boolean>>({});
  const [vehicleHistorySortByVehicleId, setVehicleHistorySortByVehicleId] = useState<Record<number, SortDirection>>({});

  const collator = useMemo(() => new Intl.Collator(language, { sensitivity: 'base' }), [language]);

  const setCustomersWithCache = useCallback<Dispatch<SetStateAction<CustomerListItem[]>>>((update) => {
    setCustomers((previous) => {
      const next = resolveStateUpdate(update, previous);

      if (authScope) {
        queryClient.setQueryData(queryKeys.customers.list(authScope), next);
      }

      return next;
    });
  }, [authScope, queryClient]);

  const setVehiclesByCustomerIdWithCache = useCallback<Dispatch<SetStateAction<Record<number, VehicleDetailDto[]>>>>((update) => {
    setVehiclesByCustomerId((previous) => {
      const next = resolveStateUpdate(update, previous);

      if (authScope) {
        syncRecordCache(queryClient, previous, next, (customerId) => queryKeys.customers.vehicles(authScope, customerId));
      }

      return next;
    });
  }, [authScope, queryClient]);

  const setCustomerHistoryByCustomerIdWithCache = useCallback<Dispatch<SetStateAction<Record<number, AppointmentDto[]>>>>((update) => {
    setCustomerHistoryByCustomerId((previous) => {
      const next = resolveStateUpdate(update, previous);

      if (authScope) {
        syncRecordCache(queryClient, previous, next, (customerId) => queryKeys.customers.customerHistory(authScope, customerId));
      }

      return next;
    });
  }, [authScope, queryClient]);

  const setVehicleHistoryByVehicleIdWithCache = useCallback<Dispatch<SetStateAction<Record<number, AppointmentDto[]>>>>((update) => {
    setVehicleHistoryByVehicleId((previous) => {
      const next = resolveStateUpdate(update, previous);

      if (authScope) {
        syncRecordCache(queryClient, previous, next, (vehicleId) => queryKeys.customers.vehicleHistory(authScope, vehicleId));
      }

      return next;
    });
  }, [authScope, queryClient]);

  const loadCustomers = useCallback(async (force = false) => {
    if (!authScope) {
      setCustomersWithCache([]);
      setIsLoadingCustomers(false);
      return;
    }

    const queryKey = queryKeys.customers.list(authScope);
    const cachedCustomers = force ? undefined : queryClient.getQueryData<CustomerListItem[]>(queryKey);

    if (cachedCustomers) {
      setCustomersWithCache(cachedCustomers);
    }

    setIsLoadingCustomers(!cachedCustomers);

    try {
      if (force) {
        await queryClient.invalidateQueries({ exact: true, queryKey });
      }

      const data = await queryClient.fetchQuery({
        gcTime: PERSISTED_QUERY_CACHE_MAX_AGE_MS,
        queryFn: customerRegistryService.listCustomers,
        queryKey,
        staleTime: CUSTOMER_REGISTRY_STALE_TIME_MS,
      });
      setCustomersWithCache(data);
    } catch {
      if (!cachedCustomers) {
        showErrorToast('customers.errors.loadFailed');
      }
    } finally {
      setIsLoadingCustomers(false);
    }
  }, [authScope, queryClient, setCustomersWithCache, showErrorToast]);

  const loadVehicles = useCallback(async (customerId: number, force = false) => {
    if (!force && vehiclesByCustomerId[customerId]) {
      return;
    }

    if (!authScope) {
      return;
    }

    const queryKey = queryKeys.customers.vehicles(authScope, customerId);
    const cachedVehicles = force ? undefined : queryClient.getQueryData<VehicleDetailDto[]>(queryKey);

    if (cachedVehicles) {
      setVehiclesByCustomerIdWithCache((prev) => ({ ...prev, [customerId]: cachedVehicles }));
      setCustomersWithCache((prev) => prev.map((item) => applyLoadedVehicleSummary(item, customerId, cachedVehicles)));
    }

    setIsLoadingVehiclesByCustomerId((prev) => ({ ...prev, [customerId]: !cachedVehicles }));

    try {
      if (force) {
        await queryClient.invalidateQueries({ exact: true, queryKey });
      }

      const data = await queryClient.fetchQuery({
        gcTime: PERSISTED_QUERY_CACHE_MAX_AGE_MS,
        queryFn: () => customerRegistryService.listVehicles(customerId),
        queryKey,
        staleTime: CUSTOMER_REGISTRY_STALE_TIME_MS,
      });
      setVehiclesByCustomerIdWithCache((prev) => ({ ...prev, [customerId]: data }));
      setCustomersWithCache((prev) => prev.map((item) => applyLoadedVehicleSummary(item, customerId, data)));
    } catch {
      if (!cachedVehicles) {
        showErrorToast('customers.errors.vehiclesLoadFailed');
      }
    } finally {
      setIsLoadingVehiclesByCustomerId((prev) => ({ ...prev, [customerId]: false }));
    }
  }, [
    authScope,
    queryClient,
    setCustomersWithCache,
    setVehiclesByCustomerIdWithCache,
    showErrorToast,
    vehiclesByCustomerId,
  ]);

  const loadCustomerHistory = useCallback(async (customerId: number, force = false) => {
    if (!force && customerHistoryByCustomerId[customerId]) {
      return;
    }

    if (!authScope) {
      return;
    }

    const queryKey = queryKeys.customers.customerHistory(authScope, customerId);
    const cachedHistory = force ? undefined : queryClient.getQueryData<AppointmentDto[]>(queryKey);

    if (cachedHistory) {
      setCustomerHistoryByCustomerIdWithCache((prev) => ({ ...prev, [customerId]: cachedHistory }));
    }

    setIsLoadingCustomerHistoryByCustomerId((prev) => ({ ...prev, [customerId]: !cachedHistory }));

    try {
      if (force) {
        await queryClient.invalidateQueries({ exact: true, queryKey });
      }

      const data = await queryClient.fetchQuery({
        gcTime: PERSISTED_QUERY_CACHE_MAX_AGE_MS,
        queryFn: () => customerRegistryService.getCustomerHistory(customerId),
        queryKey,
        staleTime: CUSTOMER_HISTORY_STALE_TIME_MS,
      });
      setCustomerHistoryByCustomerIdWithCache((prev) => ({ ...prev, [customerId]: data }));
    } catch {
      if (!cachedHistory) {
        showErrorToast('customers.errors.historyLoadFailed');
      }
    } finally {
      setIsLoadingCustomerHistoryByCustomerId((prev) => ({ ...prev, [customerId]: false }));
    }
  }, [
    authScope,
    customerHistoryByCustomerId,
    queryClient,
    setCustomerHistoryByCustomerIdWithCache,
    showErrorToast,
  ]);

  const loadVehicleHistory = useCallback(async (vehicleId: number, force = false) => {
    if (!force && vehicleHistoryByVehicleId[vehicleId]) {
      return;
    }

    if (!authScope) {
      return;
    }

    const queryKey = queryKeys.customers.vehicleHistory(authScope, vehicleId);
    const cachedHistory = force ? undefined : queryClient.getQueryData<AppointmentDto[]>(queryKey);

    if (cachedHistory) {
      setVehicleHistoryByVehicleIdWithCache((prev) => ({ ...prev, [vehicleId]: cachedHistory }));
    }

    setIsLoadingVehicleHistoryByVehicleId((prev) => ({ ...prev, [vehicleId]: !cachedHistory }));

    try {
      if (force) {
        await queryClient.invalidateQueries({ exact: true, queryKey });
      }

      const data = await queryClient.fetchQuery({
        gcTime: PERSISTED_QUERY_CACHE_MAX_AGE_MS,
        queryFn: () => customerRegistryService.getVehicleHistory(vehicleId),
        queryKey,
        staleTime: CUSTOMER_HISTORY_STALE_TIME_MS,
      });
      setVehicleHistoryByVehicleIdWithCache((prev) => ({ ...prev, [vehicleId]: data }));
    } catch {
      if (!cachedHistory) {
        showErrorToast('customers.errors.historyLoadFailed');
      }
    } finally {
      setIsLoadingVehicleHistoryByVehicleId((prev) => ({ ...prev, [vehicleId]: false }));
    }
  }, [
    authScope,
    queryClient,
    setVehicleHistoryByVehicleIdWithCache,
    showErrorToast,
    vehicleHistoryByVehicleId,
  ]);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  const normalizedSearchTerm = useMemo(() => normalizeSearchValue(searchTerm), [searchTerm]);

  const filteredCustomers = useMemo(() => {
    const filtered = normalizedSearchTerm.length > 0
      ? customers.filter((customer) => {
        const nameMatches = normalizeSearchValue(buildCustomerDisplayName(customer)).includes(normalizedSearchTerm);
        const plateMatches = customer.vehicleLicensePlates.some((plate) => (
          normalizeSearchValue(plate).includes(normalizedSearchTerm)
        ));

        return nameMatches || plateMatches;
      })
      : customers;

    return [...filtered].sort((left, right) => {
      const leftName = buildCustomerDisplayName(left);
      const rightName = buildCustomerDisplayName(right);
      const directionMultiplier = sortDirection === 'asc' ? 1 : -1;

      const nameComparison = collator.compare(leftName, rightName);

      if (nameComparison !== 0) {
        return nameComparison * directionMultiplier;
      }

      return left.vehicleCount - right.vehicleCount;
    });
  }, [collator, customers, normalizedSearchTerm, sortDirection]);

  const clearSearch = useCallback(() => setSearchTerm(''), []);
  const toggleSortDirection = useCallback(() => setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc')), []);

  const toggleCustomerExpanded = useCallback((customerId: number) => {
    const isExpanded = expandedCustomerIds.has(customerId);

    if (isExpanded) {
      setExpandedCustomerIds((prev) => {
        const next = new Set(prev);
        next.delete(customerId);
        return next;
      });
      return;
    }

    setExpandedCustomerIds((prev) => {
      const next = new Set(prev);
      next.add(customerId);
      return next;
    });

    void loadVehicles(customerId);
    void loadCustomerHistory(customerId);
  }, [expandedCustomerIds, loadCustomerHistory, loadVehicles]);

  const toggleCustomerHistorySort = useCallback((customerId: number) => {
    setCustomerHistorySortByCustomerId((prev) => ({
      ...prev,
      [customerId]: prev[customerId] === 'desc' ? 'asc' : 'desc',
    }));
  }, []);

  const toggleVehicleHistorySort = useCallback((vehicleId: number) => {
    setVehicleHistorySortByVehicleId((prev) => ({
      ...prev,
      [vehicleId]: prev[vehicleId] === 'desc' ? 'asc' : 'desc',
    }));
  }, []);

  const mutationActions = useCustomersListMutations({
    setCustomers: setCustomersWithCache,
    setVehiclesByCustomerId: setVehiclesByCustomerIdWithCache,
    setCustomerHistoryByCustomerId: setCustomerHistoryByCustomerIdWithCache,
    setVehicleHistoryByVehicleId: setVehicleHistoryByVehicleIdWithCache,
    setExpandedCustomerIds,
    vehiclesByCustomerId,
  });

  return {
    customers,
    isLoadingCustomers,
    searchTerm,
    setSearchTerm,
    sortDirection,
    expandedCustomerIds,
    vehiclesByCustomerId,
    isLoadingVehiclesByCustomerId,
    customerHistoryByCustomerId,
    isLoadingCustomerHistoryByCustomerId,
    customerHistorySortByCustomerId,
    vehicleHistoryByVehicleId,
    isLoadingVehicleHistoryByVehicleId,
    vehicleHistorySortByVehicleId,
    loadCustomers,
    loadVehicles,
    loadCustomerHistory,
    loadVehicleHistory,
    filteredCustomers,
    clearSearch,
    toggleSortDirection,
    toggleCustomerExpanded,
    toggleCustomerHistorySort,
    toggleVehicleHistorySort,
    ...mutationActions,
  };
}
