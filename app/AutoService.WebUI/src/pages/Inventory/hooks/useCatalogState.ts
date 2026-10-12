/** Catalog list-state hooks: one server-paged, server-searched read per tab, sized to the rows that fit. */
import { useEffect, useRef, type RefObject } from 'react';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useFittingPageSize } from '../../../hooks/useFittingPageSize';
import { useListPaging } from '../../../hooks/useListPaging';
import { catalogQueries } from '../../../services/queries/catalog.queries';
import { useAuthQueryScope } from '../../../services/queries/useAuthQueryScope';
import type { LaborTypeDto, PartDto } from '../../../types/catalog/catalog.types';
import type { PagedQuery, PagedResult } from '../../../types/common/pagination.types';

/** Height of one list row in the table layout; used until a rendered row can be measured. */
const FALLBACK_ROW_HEIGHT_PX = 72;

/** Room under the list: table header strip, gap and 44px pagination bar, and the page shell bottom padding. */
const RESERVED_BOTTOM_PX = 128;

const ROW_SELECTOR = '[data-testid="catalog-item-row"]';

/** State and actions of one catalog tab's list. */
export interface CatalogEntityListState<TDto> {
  readonly items: readonly TDto[];
  readonly isLoading: boolean;
  readonly isFetching: boolean;
  readonly searchTerm: string;
  readonly debouncedSearch: string;
  readonly setSearchTerm: (value: string) => void;
  readonly clearSearch: () => void;
  readonly page: number;
  readonly setPage: (page: number) => void;
  readonly pageSize: number;
  readonly totalCount: number;
}

/** A tab's list state plus the ref of the element whose height sizes the page; kept apart so the state holds no ref. */
export interface CatalogEntityList<TDto> {
  readonly list: CatalogEntityListState<TDto>;
  readonly listRef: RefObject<HTMLDivElement | null>;
}

/** Dependencies of one catalog tab list. */
interface UseCatalogEntityListParams<TDto> {
  readonly usePageQuery: (query: PagedQuery) => UseQueryResult<PagedResult<TDto>>;
  readonly loadErrorToastKey: string;
  readonly showErrorToast: (key: string) => void;
}

const NO_ITEMS: readonly never[] = [];

/** Searches (debounced, server side), pages and sizes the list of one tab, and toasts a failed first load. */
function useCatalogEntityList<TDto>({
  usePageQuery,
  loadErrorToastKey,
  showErrorToast,
}: UseCatalogEntityListParams<TDto>): CatalogEntityList<TDto> {
  const listRef = useRef<HTMLDivElement | null>(null);
  const pageSize = useFittingPageSize({
    listRef,
    fallbackItemHeightPx: FALLBACK_ROW_HEIGHT_PX,
    itemSelector: ROW_SELECTOR,
    reservedBottomPx: RESERVED_BOTTOM_PX,
  });
  const { searchTerm, setSearchTerm, debouncedSearch, page, setPage } = useListPaging();
  const query = usePageQuery({ page, pageSize, search: debouncedSearch });
  const totalCount = query.data?.totalCount ?? 0;
  const lastPage = Math.max(1, Math.ceil(totalCount / pageSize));

  // A delete or a wider window can leave the page past the end: step back to the last page.
  if (query.data !== undefined && !query.isPlaceholderData && page > lastPage) {
    setPage(lastPage);
  }

  const hasLoadFailed = query.isLoadingError && !query.isFetching;

  useEffect(() => {
    if (hasLoadFailed) {
      showErrorToast(loadErrorToastKey);
    }
  }, [hasLoadFailed, loadErrorToastKey, showErrorToast]);

  const list: CatalogEntityListState<TDto> = {
    items: query.data?.items ?? NO_ITEMS,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    searchTerm,
    debouncedSearch,
    setSearchTerm,
    clearSearch: () => {
      setSearchTerm('');
    },
    page: Math.min(page, lastPage),
    setPage,
    pageSize,
    totalCount,
  };

  return { list, listRef };
}

/** External dependencies of the catalog list hooks. */
interface UseCatalogListParams {
  readonly showErrorToast: (key: string) => void;
}

/** Page read of the parts tab. */
function usePartsPageQuery(query: PagedQuery) {
  return useQuery(catalogQueries.partsPage(useAuthQueryScope(), query));
}

/** Page read of the labor types tab. */
function useLaborTypesPageQuery(query: PagedQuery) {
  return useQuery(catalogQueries.laborTypesPage(useAuthQueryScope(), query));
}

/** Parts tab list: server-paged and server-searched. */
export function usePartsList({ showErrorToast }: UseCatalogListParams): CatalogEntityList<PartDto> {
  return useCatalogEntityList<PartDto>({
    usePageQuery: usePartsPageQuery,
    loadErrorToastKey: 'inventory.errors.loadPartsFailed',
    showErrorToast,
  });
}

/** Labor types tab list: server-paged and server-searched. */
export function useLaborTypesList({ showErrorToast }: UseCatalogListParams): CatalogEntityList<LaborTypeDto> {
  return useCatalogEntityList<LaborTypeDto>({
    usePageQuery: useLaborTypesPageQuery,
    loadErrorToastKey: 'inventory.errors.loadLaborTypesFailed',
    showErrorToast,
  });
}
