import { useCallback, useRef, useState, useSyncExternalStore } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { CustomerListItem } from '../../../types/customers/customers.types';
import { DEFAULT_MIN_PAGE_SIZE, useFittingPageSize } from '../../../hooks/useFittingPageSize';
import { useListPaging } from '../../../hooks/useListPaging';
import { useReadFailureToast } from '../../../hooks/useReadFailureToast';
import { customersQueries } from '../../../services/queries/customers.queries';
import { useAuthQueryScope } from '../../../services/queries/useAuthQueryScope';
import { useToastStore } from '../../../store/toast.store';
import type { SortDirection } from '../page.types';

/** Stable empty list for the render before the customers read has data. */
const NO_CUSTOMERS: CustomerListItem[] = [];

/** A collapsed card is the unit the page size is measured on; an expanded one is taller on purpose. */
const COLLAPSED_CARD_SELECTOR = 'article[data-expanded="false"]';
const CARD_FALLBACK_HEIGHT_PX = 78;

/** The list's `gap-3`, added to a measured card height to get the row pitch. */
const CARD_GAP_PX = 12;

/** Collapsed card heights measured per list width: the title and the meta pills wrap onto more rows as it narrows. */
const CARD_HEIGHT_BY_MIN_WIDTH: readonly (readonly [minWidthPx: number, heightPx: number])[] = [
  [976, 78],
  [500, 134],
  [330, 168],
];
const NARROWEST_CARD_HEIGHT_PX = 202;

/** Row pitch (card height plus gap) for the list's current width, used until a collapsed card is rendered. */
function estimateCardPitch(list: HTMLElement): number {
  const width = list.clientWidth;
  const match = CARD_HEIGHT_BY_MIN_WIDTH.find(([minWidthPx]) => width >= minWidthPx);
  return (match?.[1] ?? NARROWEST_CARD_HEIGHT_PX) + CARD_GAP_PX;
}

/** Space below the cards: pagination bar, end-of-list divider, their gaps and the page padding. */
const LIST_RESERVED_BOTTOM_PX = 136;

/** Below sm the end-of-list divider wraps onto three rows, with room for a two-line label. */
const NARROW_LIST_RESERVED_BOTTOM_PX = 162;
const NARROW_VIEWPORT_QUERY = '(max-width: 639.98px)';

function subscribeNarrowViewport(onChange: () => void): () => void {
  const query = globalThis.matchMedia(NARROW_VIEWPORT_QUERY);
  query.addEventListener('change', onChange);
  return () => { query.removeEventListener('change', onChange); };
}

function isNarrowViewport(): boolean {
  return globalThis.matchMedia(NARROW_VIEWPORT_QUERY).matches;
}

/** Flips one entry of a per-id sort map; an unset entry counts as ascending, so its first flip is descending. */
function toggleSortEntry(previous: Record<number, SortDirection>, id: number): Record<number, SortDirection> {
  return { ...previous, [id]: previous[id] === 'desc' ? 'asc' : 'desc' };
}

/** Manages Customers page read-side state: the paged customers read, search, expansion, and history sort directions. */
export function useCustomersListState() {
  const scope = useAuthQueryScope();
  const listRef = useRef<HTMLDivElement>(null);
  const isNarrow = useSyncExternalStore(subscribeNarrowViewport, isNarrowViewport);
  const pageSize = useFittingPageSize({
    listRef,
    fallbackItemHeightPx: CARD_FALLBACK_HEIGHT_PX,
    estimateItemHeightPx: estimateCardPitch,
    itemSelector: COLLAPSED_CARD_SELECTOR,
    reservedBottomPx: isNarrow ? NARROW_LIST_RESERVED_BOTTOM_PX : LIST_RESERVED_BOTTOM_PX,
  });
  const { searchTerm, setSearchTerm, debouncedSearch, page, setPage } = useListPaging();
  const customersQuery = useQuery({
    ...customersQueries.listPage(scope, { page, pageSize: pageSize ?? DEFAULT_MIN_PAGE_SIZE, search: debouncedSearch }),
    enabled: pageSize !== null,
  });
  const showErrorToast = useToastStore((state) => state.showError);
  useReadFailureToast({
    failureMessageKey: customersQuery.isError && customersQuery.data === undefined ? 'customers.errors.loadFailed' : null,
    errorUpdatedAt: customersQuery.errorUpdatedAt,
    isSuccess: customersQuery.isSuccess,
    showErrorToast,
  });

  const [expandedCustomerIds, setExpandedCustomerIds] = useState<Set<number>>(() => new Set());
  const [customerHistorySortByCustomerId, setCustomerHistorySortByCustomerId] = useState<Record<number, SortDirection>>({});
  const [vehicleHistorySortByVehicleId, setVehicleHistorySortByVehicleId] = useState<Record<number, SortDirection>>({});

  const customers = customersQuery.data?.items ?? NO_CUSTOMERS;
  const totalCount = customersQuery.data?.totalCount ?? 0;
  const lastPage = Math.max(1, Math.ceil(totalCount / (pageSize ?? DEFAULT_MIN_PAGE_SIZE)));
  // A deleted last row of the last page leaves an empty page: step back to the new last one.
  if (customersQuery.isSuccess && !customersQuery.isPlaceholderData && page > lastPage) {
    setPage(lastPage);
  }

  const clearSearch = useCallback(() => {
    setSearchTerm('');
  }, [setSearchTerm]);

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
    hasLoadFailed: customersQuery.isError && customersQuery.data === undefined,
    searchTerm,
    setSearchTerm,
    highlightTerm: debouncedSearch,
    listRef,
    customers,
    totalCount,
    page: Math.min(page, lastPage),
    pageSize: pageSize ?? DEFAULT_MIN_PAGE_SIZE,
    setPage,
    isPageLoading: customersQuery.isPlaceholderData,
    expandedCustomerIds,
    customerHistorySortByCustomerId,
    vehicleHistorySortByVehicleId,
    clearSearch,
    toggleCustomerExpanded,
    toggleCustomerHistorySort,
    toggleVehicleHistorySort,
  };
}
