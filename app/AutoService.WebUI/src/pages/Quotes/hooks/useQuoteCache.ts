/** Writes into the quote query caches: a saved quote lands in its detail and list entries, a deleted one leaves them, and the revenue report is marked stale. */
import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../services/cache/queryKeys';
import { quotesQueries } from '../../../services/queries/quotes.queries';
import { useAuthQueryScope } from '../../../services/queries/useAuthQueryScope';
import type { QuoteDetailDto, QuoteListItemDto } from '../../../types/quotes/quotes.types';
import { removeQuoteRow, upsertQuoteRow } from './quoteCache.helpers';

/** Cache writers behind the quote writes; each one does nothing while nobody is signed in. */
export function useQuoteCache() {
  const queryClient = useQueryClient();
  const scope = useAuthQueryScope();

  /** Stores a quote a write returned in its detail entry and list row, then refetches the list to reconcile. */
  const storeQuote = useCallback((detail: QuoteDetailDto) => {
    if (scope === null) {
      return;
    }

    const listKey = quotesQueries.list(scope).queryKey;

    queryClient.setQueryData<QuoteDetailDto>(quotesQueries.detail(scope, detail.id).queryKey, detail);
    queryClient.setQueryData<QuoteListItemDto[]>(listKey, (rows) => upsertQuoteRow(rows, detail));
    void queryClient.invalidateQueries({ exact: true, queryKey: listKey });
  }, [queryClient, scope]);

  /** Drops a deleted quote from its detail entry and from the list. */
  const removeQuote = useCallback((quoteId: number) => {
    if (scope === null) {
      return;
    }

    const listKey = quotesQueries.list(scope).queryKey;

    queryClient.removeQueries({ exact: true, queryKey: quotesQueries.detail(scope, quoteId).queryKey });
    queryClient.setQueryData<QuoteListItemDto[]>(listKey, (rows) => removeQuoteRow(rows, quoteId));
    void queryClient.invalidateQueries({ exact: true, queryKey: listKey });
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
