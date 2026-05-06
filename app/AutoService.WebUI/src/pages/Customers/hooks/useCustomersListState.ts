import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AppointmentDto } from '../../../types/scheduler/scheduler.types';
import type { CustomerListItem, VehicleDetailDto } from '../../../types/customers/customers.types';
import { customerRegistryService } from '../../../services/customers/customer-registry.service';
import { buildCustomerDisplayName, normalizeSearchValue } from '../helpers';
import type { CustomerSortField, SortDirection } from '../page.types';

/** External dependencies for the customers list-state hook. */
interface UseCustomersListStateParams {
  language: string;
  showErrorToast: (message: string) => void;
}

/**
 * Manages Customers page read-side state: list loading, search/sort, expansion,
 * and on-demand repair history loading for customers and vehicles.
 * @param params Hook dependencies for locale-aware sorting and error surfacing.
 * @returns Stateful values and actions consumed by the Customers page container.
 */
export function useCustomersListState({ language, showErrorToast }: UseCustomersListStateParams) {
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<CustomerSortField>('name');
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
  const [activeVehicleHistoryByCustomerId, setActiveVehicleHistoryByCustomerId] = useState<Record<number, number | null>>({});

  const collator = useMemo(() => new Intl.Collator(language, { sensitivity: 'base' }), [language]);

  const loadCustomers = useCallback(async () => {
    setIsLoadingCustomers(true);

    try {
      const data = await customerRegistryService.listCustomers();
      setCustomers(data);
    } catch {
      showErrorToast('customers.errors.loadFailed');
    } finally {
      setIsLoadingCustomers(false);
    }
  }, [showErrorToast]);

  const loadVehicles = useCallback(async (customerId: number, force = false) => {
    if (!force && vehiclesByCustomerId[customerId]) {
      return;
    }

    setIsLoadingVehiclesByCustomerId((prev) => ({ ...prev, [customerId]: true }));

    try {
      const data = await customerRegistryService.listVehicles(customerId);
      setVehiclesByCustomerId((prev) => ({ ...prev, [customerId]: data }));
      setCustomers((prev) => prev.map((item) => (
        item.id === customerId ? { ...item, vehicleCount: data.length } : item
      )));
    } catch {
      showErrorToast('customers.errors.vehiclesLoadFailed');
    } finally {
      setIsLoadingVehiclesByCustomerId((prev) => ({ ...prev, [customerId]: false }));
    }
  }, [showErrorToast, vehiclesByCustomerId]);

  const loadCustomerHistory = useCallback(async (customerId: number, force = false) => {
    if (!force && customerHistoryByCustomerId[customerId]) {
      return;
    }

    setIsLoadingCustomerHistoryByCustomerId((prev) => ({ ...prev, [customerId]: true }));

    try {
      const data = await customerRegistryService.getCustomerHistory(customerId);
      setCustomerHistoryByCustomerId((prev) => ({ ...prev, [customerId]: data }));
    } catch {
      showErrorToast('customers.errors.historyLoadFailed');
    } finally {
      setIsLoadingCustomerHistoryByCustomerId((prev) => ({ ...prev, [customerId]: false }));
    }
  }, [customerHistoryByCustomerId, showErrorToast]);

  const loadVehicleHistory = useCallback(async (vehicleId: number, force = false) => {
    if (!force && vehicleHistoryByVehicleId[vehicleId]) {
      return;
    }

    setIsLoadingVehicleHistoryByVehicleId((prev) => ({ ...prev, [vehicleId]: true }));

    try {
      const data = await customerRegistryService.getVehicleHistory(vehicleId);
      setVehicleHistoryByVehicleId((prev) => ({ ...prev, [vehicleId]: data }));
    } catch {
      showErrorToast('customers.errors.historyLoadFailed');
    } finally {
      setIsLoadingVehicleHistoryByVehicleId((prev) => ({ ...prev, [vehicleId]: false }));
    }
  }, [showErrorToast, vehicleHistoryByVehicleId]);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  const normalizedSearchTerm = useMemo(() => normalizeSearchValue(searchTerm), [searchTerm]);

  const filteredCustomers = useMemo(() => {
    const filtered = normalizedSearchTerm.length > 0
      ? customers.filter((customer) => normalizeSearchValue(buildCustomerDisplayName(customer)).includes(normalizedSearchTerm))
      : customers;

    return [...filtered].sort((left, right) => {
      const leftName = buildCustomerDisplayName(left);
      const rightName = buildCustomerDisplayName(right);
      const directionMultiplier = sortDirection === 'asc' ? 1 : -1;

      if (sortField === 'vehicleCount') {
        const vehicleCountComparison = left.vehicleCount - right.vehicleCount;

        if (vehicleCountComparison !== 0) {
          return vehicleCountComparison * directionMultiplier;
        }

        return collator.compare(leftName, rightName);
      }

      const nameComparison = collator.compare(leftName, rightName);

      if (nameComparison !== 0) {
        return nameComparison * directionMultiplier;
      }

      return left.vehicleCount - right.vehicleCount;
    });
  }, [collator, customers, normalizedSearchTerm, sortDirection, sortField]);

  const clearSearch = useCallback(() => setSearchTerm(''), []);
  const toggleSortDirection = useCallback(() => setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc')), []);
  const handleSortFieldChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    setSortField(event.target.value as CustomerSortField);
  }, []);

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

  const toggleVehicleHistory = useCallback((customerId: number, vehicleId: number) => {
    const current = activeVehicleHistoryByCustomerId[customerId] ?? null;
    const next = current === vehicleId ? null : vehicleId;

    setActiveVehicleHistoryByCustomerId((prev) => ({ ...prev, [customerId]: next }));

    if (next !== null) {
      void loadVehicleHistory(next);
    }
  }, [activeVehicleHistoryByCustomerId, loadVehicleHistory]);

  const toggleVehicleHistorySort = useCallback((vehicleId: number) => {
    setVehicleHistorySortByVehicleId((prev) => ({
      ...prev,
      [vehicleId]: prev[vehicleId] === 'desc' ? 'asc' : 'desc',
    }));
  }, []);

  return {
    customers,
    setCustomers,
    isLoadingCustomers,
    searchTerm,
    setSearchTerm,
    sortField,
    sortDirection,
    expandedCustomerIds,
    setExpandedCustomerIds,
    vehiclesByCustomerId,
    setVehiclesByCustomerId,
    isLoadingVehiclesByCustomerId,
    customerHistoryByCustomerId,
    setCustomerHistoryByCustomerId,
    isLoadingCustomerHistoryByCustomerId,
    customerHistorySortByCustomerId,
    vehicleHistoryByVehicleId,
    setVehicleHistoryByVehicleId,
    isLoadingVehicleHistoryByVehicleId,
    vehicleHistorySortByVehicleId,
    activeVehicleHistoryByCustomerId,
    setActiveVehicleHistoryByCustomerId,
    loadCustomers,
    loadVehicles,
    loadCustomerHistory,
    loadVehicleHistory,
    filteredCustomers,
    clearSearch,
    toggleSortDirection,
    handleSortFieldChange,
    toggleCustomerExpanded,
    toggleCustomerHistorySort,
    toggleVehicleHistory,
    toggleVehicleHistorySort,
  };
}
