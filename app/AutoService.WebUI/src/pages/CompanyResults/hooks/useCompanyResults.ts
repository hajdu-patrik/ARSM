/** Company result page state: the selected period and its report, one cached read per period; a quote-less month still renders since the API returns zeros, not 404. */
import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { companyResultsQueries } from '../../../services/queries/company-results.queries';
import { useAuthQueryScope } from '../../../services/queries/useAuthQueryScope';
import { isFutureMonth } from '../helpers';

interface UseCompanyResultsParams {
  showErrorToast: (key: string) => void;
}

export function useCompanyResults({ showErrorToast }: UseCompanyResultsParams) {
  const scope = useAuthQueryScope();
  const [year, setYear] = useState(() => new Date().getUTCFullYear());
  const [month, setMonth] = useState<number | null>(null);
  const { data, isLoading, isLoadingError, isFetching } = useQuery(companyResultsQueries.period(scope, year, month));
  const hasLoadFailed = isLoadingError && !isFetching;

  // Stepping the year can land the selected month in the future, where its tile is disabled; fall back to the whole year.
  const selectYear = useCallback((nextYear: number) => {
    setYear(nextYear);
    setMonth((current) => (current !== null && isFutureMonth(nextYear, current) ? null : current));
  }, []);

  useEffect(() => {
    if (hasLoadFailed) {
      showErrorToast('companyResults.errors.loadFailed');
    }
  }, [hasLoadFailed, showErrorToast]);

  return { year, month, setYear: selectYear, setMonth, result: data ?? null, isLoading };
}
