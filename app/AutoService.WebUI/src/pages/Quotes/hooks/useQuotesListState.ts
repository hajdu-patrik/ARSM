/** Quote list-state hook: one server-paged, server-searched read sized to the rows that fit; the status chip maps to the stored status. */
import { useCallback, useRef, useState, type RefObject } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFittingPageSize } from '../../../hooks/useFittingPageSize';
import { useListPaging } from '../../../hooks/useListPaging';
import { useReadFailureToast } from '../../../hooks/useReadFailureToast';
import { quotesQueries } from '../../../services/queries/quotes.queries';
import { useAuthQueryScope } from '../../../services/queries/useAuthQueryScope';
import type { QuoteListItemDto, QuoteListQuery } from '../../../types/quotes/quotes.types';
import { toQuoteListFilter, type QuoteStatusFilter } from '../helpers';

/** Height of one list row in the table layout; used until a rendered row can be measured. */
const FALLBACK_ROW_HEIGHT_PX = 80;

/** Room under the list: table header strip, gap, 44px pagination bar and the page shell bottom padding. */
const RESERVED_BOTTOM_PX = 140;

const ROW_SELECTOR = '[data-testid="quote-row"]';

/** Rows shown while the list has not loaded; one shared array keeps the reference stable. */
const NO_QUOTES: QuoteListItemDto[] = [];

/** External dependencies for the quote list-state hook. */
interface UseQuotesListStateParams {
  showErrorToast: (key: string) => void;
}

/** State and actions exposed for the quote list. */
export interface QuotesListState {
  readonly quotes: QuoteListItemDto[];
  readonly isLoading: boolean;
  readonly isFetching: boolean;
  readonly searchTerm: string;
  readonly debouncedSearch: string;
  readonly setSearchTerm: (value: string) => void;
  readonly clearSearch: () => void;
  readonly statusFilter: QuoteStatusFilter;
  readonly setStatusFilter: (filter: QuoteStatusFilter) => void;
  readonly page: number;
  readonly setPage: (page: number) => void;
  readonly pageSize: number;
  readonly totalCount: number;
}

/** The list state plus the ref of the element whose height sizes the page; kept apart so the state holds no ref. */
export interface QuotesList {
  readonly list: QuotesListState;
  readonly listRef: RefObject<HTMLDivElement | null>;
}

/** Loads one page of quotes; search and the stored status filter run on the server. */
export function useQuotesListState({ showErrorToast }: UseQuotesListStateParams): QuotesList {
  const scope = useAuthQueryScope();
  const listRef = useRef<HTMLDivElement | null>(null);
  const pageSize = useFittingPageSize({
    listRef,
    fallbackItemHeightPx: FALLBACK_ROW_HEIGHT_PX,
    itemSelector: ROW_SELECTOR,
    reservedBottomPx: RESERVED_BOTTOM_PX,
  });
  const { searchTerm, setSearchTerm, debouncedSearch, page, setPage } = useListPaging();
  const [statusFilter, setStatusFilterState] = useState<QuoteStatusFilter>('All');

  const query: QuoteListQuery = { page, pageSize, search: debouncedSearch, ...toQuoteListFilter(statusFilter) };
  const { data, isLoading, isFetching, isPlaceholderData, isLoadingError, isSuccess, errorUpdatedAt } = useQuery(
    quotesQueries.listPage(scope, query),
  );
  const totalCount = data?.totalCount ?? 0;
  const lastPage = Math.max(1, Math.ceil(totalCount / pageSize));

  // A delete or a wider window can leave the page past the end: step back to the last page.
  if (data !== undefined && !isPlaceholderData && page > lastPage) {
    setPage(lastPage);
  }

  useReadFailureToast({
    failureMessageKey: isLoadingError ? 'quotes.errors.loadQuotesFailed' : null,
    errorUpdatedAt,
    isSuccess,
    showErrorToast,
  });

  const quotes = data?.items ?? NO_QUOTES;

  // A new filter starts again from the first page.
  const setStatusFilter = useCallback((filter: QuoteStatusFilter) => {
    setStatusFilterState(filter);
    setPage(1);
  }, [setPage]);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
  }, [setSearchTerm]);

  const list: QuotesListState = {
    quotes,
    isLoading,
    isFetching,
    searchTerm,
    debouncedSearch,
    setSearchTerm,
    clearSearch,
    statusFilter,
    setStatusFilter,
    page: Math.min(page, lastPage),
    setPage,
    pageSize,
    totalCount,
  };

  return { list, listRef };
}
