/** Company result page state: the selected period and its report, one cached read per period; a quote-less month still renders since the API returns zeros, not 404. */
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { companyResultsQueries } from '../../../services/queries/company-results.queries';
import { useAuthQueryScope } from '../../../services/queries/useAuthQueryScope';

/** External dependencies for the company result hook. */
interface UseCompanyResultsParams {
  showErrorToast: (key: string) => void;
}

/** Loads the revenue report for the selected period. */
export function useCompanyResults({ showErrorToast }: UseCompanyResultsParams) {
  const scope = useAuthQueryScope();
  const [year, setYear] = useState(() => new Date().getUTCFullYear());
  const [month, setMonth] = useState<number | null>(null);
  const { data, isLoading, isLoadingError, isFetching } = useQuery(companyResultsQueries.period(scope, year, month));
  const hasLoadFailed = isLoadingError && !isFetching;

  useEffect(() => {
    if (hasLoadFailed) {
      showErrorToast('companyResults.errors.loadFailed');
    }
  }, [hasLoadFailed, showErrorToast]);

  return { year, month, setYear, setMonth, result: data ?? null, isLoading };
}
