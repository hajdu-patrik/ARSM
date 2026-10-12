/** Writes into the quote query caches: a saved quote lands in its detail entry and the visible list pages refetch; the revenue report is marked stale. */
import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../services/cache/queryKeys';
import { quotesQueries } from '../../../services/queries/quotes.queries';
import { useAuthQueryScope } from '../../../services/queries/useAuthQueryScope';
import type { QuoteDetailDto } from '../../../types/quotes/quotes.types';

/** Cache writers behind the quote writes; each one does nothing while nobody is signed in. */
export function useQuoteCache() {
  const queryClient = useQueryClient();
  const scope = useAuthQueryScope();

  /** Stores a quote a write returned in its detail entry, then refetches the visible list pages (the prefix covers every page key). */
  const storeQuote = useCallback((detail: QuoteDetailDto) => {
    if (scope === null) {
      return;
    }

    queryClient.setQueryData<QuoteDetailDto>(quotesQueries.detail(scope, detail.id).queryKey, detail);
    void queryClient.invalidateQueries({ queryKey: queryKeys.quotes.list(scope) });
  }, [queryClient, scope]);

  /** Drops a deleted quote's detail entry and refetches the visible list pages. */
  const removeQuote = useCallback((quoteId: number) => {
    if (scope === null) {
      return;
    }

    queryClient.removeQueries({ exact: true, queryKey: quotesQueries.detail(scope, quoteId).queryKey });
    void queryClient.invalidateQueries({ queryKey: queryKeys.quotes.list(scope) });
  }, [queryClient, scope]);

  /** Refetches one quote whatever its age (after a stale-version conflict) and stores the fresh copy; rejects when the read fails. */
  const refreshQuote = useCallback(async (quoteId: number) => {
    if (scope === null) {
      return;
    }

    storeQuote(await queryClient.query<QuoteDetailDto>({ ...quotesQueries.detail(scope, quoteId), staleTime: 0 }));
  }, [queryClient, scope, storeQuote]);

  /** Marks every cached revenue report stale, so the report refetches the next time it opens. */
  const invalidateReport = useCallback(() => {
    if (scope === null) {
      return;
    }

    void queryClient.invalidateQueries({ queryKey: queryKeys.companyResults.root(scope) });
  }, [queryClient, scope]);

  return { storeQuote, removeQuote, refreshQuote, invalidateReport };
}
