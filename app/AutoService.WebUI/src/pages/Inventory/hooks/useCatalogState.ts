/** Catalog list-state hooks: one server-paged, server-searched read per tab, sized to the rows that fit. */
import { useEffect, useRef, type RefObject } from 'react';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { DEFAULT_MIN_PAGE_SIZE, useFittingPageSize } from '../../../hooks/useFittingPageSize';
import { useListPaging } from '../../../hooks/useListPaging';
import { catalogQueries } from '../../../services/queries/catalog.queries';
import { useAuthQueryScope } from '../../../services/queries/useAuthQueryScope';
import type { LaborTypeDto, PartDto } from '../../../types/catalog/catalog.types';
import type { PagedQuery, PagedResult } from '../../../types/common/pagination.types';

/** Measured pitch (row plus divider) of one table-layout row; used until a rendered row can be measured. */
const FALLBACK_ROW_HEIGHT_PX = 69;

/** Measured tile-layout pitches: the list switches to tiles below 48rem, and below ~357px the tile text wraps one px less. */
const TILE_ROW_HEIGHT_PX = 193;
const NARROW_TILE_ROW_HEIGHT_PX = 192;
const TABLE_MIN_WIDTH_PX = 768;
const NARROW_TILE_MAX_WIDTH_PX = 357;

/** Row pitch estimate from the list width (table or tile layout), used before a row is rendered. */
function estimateRowHeight(list: HTMLElement): number {
  const width = list.getBoundingClientRect().width;

  if (width >= TABLE_MIN_WIDTH_PX) {
    return FALLBACK_ROW_HEIGHT_PX;
  }

  return width < NARROW_TILE_MAX_WIDTH_PX ? NARROW_TILE_ROW_HEIGHT_PX : TILE_ROW_HEIGHT_PX;
}

/** Room under the list: table header strip, gap and 44px pagination bar, and the page shell bottom padding. */
const RESERVED_BOTTOM_PX = 128;

const ROW_SELECTOR = '[data-testid="catalog-item-row"]';

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

interface UseCatalogEntityListParams<TDto> {
  readonly usePageQuery: (query: PagedQuery, isEnabled: boolean) => UseQueryResult<PagedResult<TDto>>;
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
    estimateItemHeightPx: estimateRowHeight,
    itemSelector: ROW_SELECTOR,
    reservedBottomPx: RESERVED_BOTTOM_PX,
  });
  const { searchTerm, setSearchTerm, debouncedSearch, page, setPage } = useListPaging();
  const query = usePageQuery({ page, pageSize: pageSize ?? DEFAULT_MIN_PAGE_SIZE, search: debouncedSearch }, pageSize !== null);
  const totalCount = query.data?.totalCount ?? 0;
  const lastPage = Math.max(1, Math.ceil(totalCount / (pageSize ?? DEFAULT_MIN_PAGE_SIZE)));

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
    pageSize: pageSize ?? DEFAULT_MIN_PAGE_SIZE,
    totalCount,
  };

  return { list, listRef };
}

interface UseCatalogListParams {
  readonly showErrorToast: (key: string) => void;
}

function usePartsPageQuery(query: PagedQuery, isEnabled: boolean) {
  return useQuery({ ...catalogQueries.partsPage(useAuthQueryScope(), query), enabled: isEnabled });
}

function useLaborTypesPageQuery(query: PagedQuery, isEnabled: boolean) {
  return useQuery({ ...catalogQueries.laborTypesPage(useAuthQueryScope(), query), enabled: isEnabled });
}

export function usePartsList({ showErrorToast }: UseCatalogListParams): CatalogEntityList<PartDto> {
  return useCatalogEntityList<PartDto>({
    usePageQuery: usePartsPageQuery,
    loadErrorToastKey: 'inventory.errors.loadPartsFailed',
    showErrorToast,
  });
}

export function useLaborTypesList({ showErrorToast }: UseCatalogListParams): CatalogEntityList<LaborTypeDto> {
  return useCatalogEntityList<LaborTypeDto>({
    usePageQuery: useLaborTypesPageQuery,
    loadErrorToastKey: 'inventory.errors.loadLaborTypesFailed',
    showErrorToast,
  });
}
