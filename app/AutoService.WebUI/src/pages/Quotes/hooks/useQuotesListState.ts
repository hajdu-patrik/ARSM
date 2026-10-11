/** Quote list-state hook: the list is one cached read, filtered client-side; expiry is a computed flag, so one read serves every chip. */
import { useCallback, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useReadFailureToast } from '../../../hooks/useReadFailureToast';
import { quotesQueries } from '../../../services/queries/quotes.queries';
import { useAuthQueryScope } from '../../../services/queries/useAuthQueryScope';
import type { QuoteListItemDto } from '../../../types/quotes/quotes.types';
import {
  matchesQuoteSearch,
  matchesQuoteStatusFilter,
  normalizeQuoteSearchValue,
  type QuoteStatusFilter,
} from '../helpers';

/** Rows shown while the list has not loaded; one shared array keeps the filtered memo stable. */
const NO_QUOTES: QuoteListItemDto[] = [];

/** External dependencies for the quote list-state hook. */
interface UseQuotesListStateParams {
  showErrorToast: (key: string) => void;
}

/** State and actions exposed for the quote list. */
export interface QuotesListState {
  readonly quotes: QuoteListItemDto[];
  readonly filteredQuotes: QuoteListItemDto[];
  readonly isLoading: boolean;
  readonly searchTerm: string;
  readonly setSearchTerm: Dispatch<SetStateAction<string>>;
  readonly clearSearch: () => void;
  readonly statusFilter: QuoteStatusFilter;
  readonly setStatusFilter: Dispatch<SetStateAction<QuoteStatusFilter>>;
}

/** Loads and filters the quote list. */
export function useQuotesListState({ showErrorToast }: UseQuotesListStateParams): QuotesListState {
  const scope = useAuthQueryScope();
  const { data, isLoading, isLoadingError, isSuccess, errorUpdatedAt } = useQuery(quotesQueries.list(scope));
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<QuoteStatusFilter>('All');
  const quotes = data ?? NO_QUOTES;

  useReadFailureToast({
    failureMessageKey: isLoadingError ? 'quotes.errors.loadQuotesFailed' : null,
    errorUpdatedAt,
    isSuccess,
    showErrorToast,
  });

  const normalizedSearchTerm = useMemo(() => normalizeQuoteSearchValue(searchTerm), [searchTerm]);

  // The server already orders by creation date descending, so the list keeps
  // that order and only narrows it here.
  const filteredQuotes = useMemo(
    () => quotes.filter(
      (quote) => matchesQuoteStatusFilter(quote, statusFilter) && matchesQuoteSearch(quote, normalizedSearchTerm),
    ),
    [normalizedSearchTerm, quotes, statusFilter],
  );

  const clearSearch = useCallback(() => {
    setSearchTerm('');
  }, []);

  return {
    quotes,
    filteredQuotes,
    isLoading,
    searchTerm,
    setSearchTerm,
    clearSearch,
    statusFilter,
    setStatusFilter,
  };
}
