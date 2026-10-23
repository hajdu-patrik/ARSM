/** Resolves the newest quote of an appointment and opens it in the Quotes page. */
import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { APP_ROUTE_PATHS } from '../router/appRoutes';
import { quotesQueries } from '../services/queries/quotes.queries';
import { useAuthQueryScope } from '../services/queries/useAuthQueryScope';

export interface AppointmentQuoteLink {
  quoteId: number | null;
  isResolving: boolean;
  openQuote: () => void;
}

export function useAppointmentQuoteLink(appointmentId: number | null, enabled = true): AppointmentQuoteLink {
  const scope = useAuthQueryScope();
  const navigate = useNavigate();
  const isValidId = appointmentId !== null && Number.isInteger(appointmentId) && appointmentId > 0;

  const query = useQuery({
    ...quotesQueries.listPage(scope, { ...(isValidId ? { appointmentId } : {}), page: 1, pageSize: 50 }),
    enabled: enabled && isValidId,
  });

  const items = query.data?.items ?? [];
  const quoteId = items.length > 0 ? Math.max(...items.map((item) => item.id)) : null;

  const openQuote = useCallback(() => {
    if (quoteId !== null) {
      void navigate(`${APP_ROUTE_PATHS.quotes}?quoteId=${String(quoteId)}`);
    }
  }, [navigate, quoteId]);

  return { quoteId, isResolving: query.isLoading, openQuote };
}
