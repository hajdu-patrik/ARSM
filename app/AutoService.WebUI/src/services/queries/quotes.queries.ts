/** Query options of the quote reads: one page of the list and one quote with its lines and totals. */

import { QUOTES_STALE_TIME_MS } from '../cache/cache-policy';
import { queryKeys, type AuthQueryScope } from '../cache/queryKeys';
import { quoteService } from '../quotes/quote.service';
import type { QuoteListQuery } from '../../types/quotes/quotes.types';
import { scopedQueryOptions } from './scopedQueryOptions';

/** Quote read factories; every one takes the scope of useAuthQueryScope() first. */
export const quotesQueries = {
  /** One page of quotes, newest first; the previous page stays visible while the next loads. */
  listPage: (scope: AuthQueryScope | null, query: QuoteListQuery) =>
    scopedQueryOptions(
      scope,
      (authScope) => queryKeys.quotes.listPage(authScope, query),
      (request) => quoteService.listQuotes(query, request),
      QUOTES_STALE_TIME_MS,
      true,
    ),

  /** One quote with its lines and totals. */
  detail: (scope: AuthQueryScope | null, quoteId: number) =>
    scopedQueryOptions(
      scope,
      (authScope) => queryKeys.quotes.detail(authScope, quoteId),
      (request) => quoteService.getQuote(quoteId, request),
      QUOTES_STALE_TIME_MS,
    ),
};
