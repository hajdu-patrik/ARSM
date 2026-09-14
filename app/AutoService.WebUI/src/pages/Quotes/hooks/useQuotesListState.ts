/**
 * Quote list-state hook.
 *
 * Loads the quote list into the authenticated query cache, then applies the
 * toolbar search and status filter on the client: expiry is a computed
 * response flag rather than a stored status, so one read serves every chip.
 * @module pages/Quotes/hooks/useQuotesListState
 */
import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { QuoteListItemDto } from '../../../types/quotes/quotes.types';
import { quoteService } from '../../../services/quotes/quote.service';
import { PERSISTED_QUERY_CACHE_MAX_AGE_MS, QUOTES_STALE_TIME_MS } from '../../../services/cache/cache-policy';
import { getAuthQueryScope, queryKeys } from '../../../services/cache/queryKeys';
import { useAuthStore } from '../../../store/auth.store';
import {
  matchesQuoteSearch,
  matchesQuoteStatusFilter,
  normalizeQuoteSearchValue,
  type QuoteStatusFilter,
} from '../helpers';

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
  readonly load: (force?: boolean) => Promise<void>;
}

/**
 * Loads and filters the quote list.
 * @param params Localized error toast handler.
 * @returns Quote list state, search/filter controls, and the loader.
 */
export function useQuotesListState({ showErrorToast }: UseQuotesListStateParams): QuotesListState {
  const queryClient = useQueryClient();
  const authUser = useAuthStore((state) => state.user);
  const authScope = useMemo(() => getAuthQueryScope(authUser), [authUser]);
  const [quotes, setQuotes] = useState<QuoteListItemDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<QuoteStatusFilter>('All');

  const load = useCallback(async (force = false) => {
    if (!authScope) {
      setQuotes([]);
      setIsLoading(false);
      return;
    }

    const key = queryKeys.quotes.list(authScope);
    const cached = force ? undefined : queryClient.getQueryData<QuoteListItemDto[]>(key);

    if (cached) {
      setQuotes(cached);
    }

    setIsLoading(!cached);

    try {
      if (force) {
        await queryClient.invalidateQueries({ exact: true, queryKey: key });
      }

      const data = await queryClient.fetchQuery({
        gcTime: PERSISTED_QUERY_CACHE_MAX_AGE_MS,
        queryFn: quoteService.listQuotes,
        queryKey: key,
        staleTime: QUOTES_STALE_TIME_MS,
      });
      setQuotes(data);
    } catch {
      if (!cached) {
        showErrorToast('quotes.errors.loadQuotesFailed');
      }
    } finally {
      setIsLoading(false);
    }
  }, [authScope, queryClient, showErrorToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const normalizedSearchTerm = useMemo(() => normalizeQuoteSearchValue(searchTerm), [searchTerm]);

  // The server already orders by creation date descending, so the list keeps
  // that order and only narrows it here.
  const filteredQuotes = useMemo(
    () => quotes.filter(
      (quote) => matchesQuoteStatusFilter(quote, statusFilter) && matchesQuoteSearch(quote, normalizedSearchTerm),
    ),
    [normalizedSearchTerm, quotes, statusFilter],
  );

  const clearSearch = useCallback(() => setSearchTerm(''), []);

  return {
    quotes,
    filteredQuotes,
    isLoading,
    searchTerm,
    setSearchTerm,
    clearSearch,
    statusFilter,
    setStatusFilter,
    load,
  };
}
