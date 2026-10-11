/** Query options of the quote reads: the list and one quote with its lines and totals. */

import { QUOTES_STALE_TIME_MS } from '../cache/cache-policy';
import { queryKeys, type AuthQueryScope } from '../cache/queryKeys';
import { quoteService } from '../quotes/quote.service';
import { scopedQueryOptions } from './scopedQueryOptions';

/** Quote read factories; every one takes the scope of useAuthQueryScope() first. */
export const quotesQueries = {
  /** Every quote, newest first. */
  list: (scope: AuthQueryScope | null) =>
    scopedQueryOptions(
      scope,
      queryKeys.quotes.list,
      (request) => quoteService.listQuotes(request),
      QUOTES_STALE_TIME_MS,
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
