import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { CustomerListItem } from '../../../types/customers/customers.types';
import { useReadFailureToast } from '../../../hooks/useReadFailureToast';
import { customersQueries } from '../../../services/queries/customers.queries';
import { useAuthQueryScope } from '../../../services/queries/useAuthQueryScope';
import { useToastStore } from '../../../store/toast.store';
import { toIntlLocale } from '../../../utils/intlFormat';
import { normalizeSearchValue } from '../../../utils/textSearch';
import type { SortDirection } from '../page.types';
import { filterCustomersBySearch, sortCustomersByName } from './useCustomersListState.helpers';

/** External dependencies for the customers list-state hook. */
interface UseCustomersListStateParams {
  language: string;
}

/** Stable empty list for the render before the customers read has data. */
const NO_CUSTOMERS: CustomerListItem[] = [];

/** Flips one entry of a per-id sort map; an unset entry counts as ascending, so its first flip is descending. */
function toggleSortEntry(previous: Record<number, SortDirection>, id: number): Record<number, SortDirection> {
  return { ...previous, [id]: previous[id] === 'desc' ? 'asc' : 'desc' };
}

/** Manages Customers page read-side state: the customers read, search/sort, expansion, and history sort directions. */
export function useCustomersListState({ language }: UseCustomersListStateParams) {
  const scope = useAuthQueryScope();
  const customersQuery = useQuery(customersQueries.list(scope));
  const showErrorToast = useToastStore((state) => state.showError);
  useReadFailureToast({
    failureMessageKey: customersQuery.isError && customersQuery.data === undefined ? 'customers.errors.loadFailed' : null,
    errorUpdatedAt: customersQuery.errorUpdatedAt,
    isSuccess: customersQuery.isSuccess,
    showErrorToast,
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [expandedCustomerIds, setExpandedCustomerIds] = useState<Set<number>>(() => new Set());
  const [customerHistorySortByCustomerId, setCustomerHistorySortByCustomerId] = useState<Record<number, SortDirection>>({});
  const [vehicleHistorySortByVehicleId, setVehicleHistorySortByVehicleId] = useState<Record<number, SortDirection>>({});

  const collator = useMemo(() => new Intl.Collator(toIntlLocale(language), { sensitivity: 'base' }), [language]);
  const customers = customersQuery.data ?? NO_CUSTOMERS;
  const normalizedSearchTerm = useMemo(() => normalizeSearchValue(searchTerm), [searchTerm]);

  const filteredCustomers = useMemo(
    () => sortCustomersByName(filterCustomersBySearch(customers, normalizedSearchTerm), collator, sortDirection),
    [collator, customers, normalizedSearchTerm, sortDirection],
  );

  const clearSearch = useCallback(() => {
    setSearchTerm('');
  }, []);

  const toggleSortDirection = useCallback(() => {
    setSortDirection((previous) => (previous === 'asc' ? 'desc' : 'asc'));
  }, []);

  const toggleCustomerExpanded = useCallback((customerId: number) => {
    setExpandedCustomerIds((previous) => {
      const next = new Set(previous);

      if (!next.delete(customerId)) {
        next.add(customerId);
      }

      return next;
    });
  }, []);

  const toggleCustomerHistorySort = useCallback((customerId: number) => {
    setCustomerHistorySortByCustomerId((previous) => toggleSortEntry(previous, customerId));
  }, []);

  const toggleVehicleHistorySort = useCallback((vehicleId: number) => {
    setVehicleHistorySortByVehicleId((previous) => toggleSortEntry(previous, vehicleId));
  }, []);

  return {
    isLoadingCustomers: customersQuery.isLoading,
    searchTerm,
    setSearchTerm,
    sortDirection,
    expandedCustomerIds,
    customerHistorySortByCustomerId,
    vehicleHistorySortByVehicleId,
    filteredCustomers,
    clearSearch,
    toggleSortDirection,
    toggleCustomerExpanded,
    toggleCustomerHistorySort,
    toggleVehicleHistorySort,
  };
}
