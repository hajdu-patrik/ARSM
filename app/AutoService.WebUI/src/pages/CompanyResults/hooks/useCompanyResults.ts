/** Company results page state: the selected period and its report, one cached read per period. */
import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useQueryReadFailureToast } from '../../../hooks/useReadFailureToast';
import { companyResultsQueries } from '../../../services/queries/company-results.queries';
import { useAuthQueryScope } from '../../../services/queries/useAuthQueryScope';
import { isFutureMonth } from '../helpers';

interface UseCompanyResultsParams {
  showErrorToast: (key: string) => void;
}

/** Holds the selected year and month and reads the report for that period. */
export function useCompanyResults({ showErrorToast }: UseCompanyResultsParams) {
  const scope = useAuthQueryScope();
  const [year, setYear] = useState(() => new Date().getUTCFullYear());
  const [month, setMonth] = useState<number | null>(null);
  const query = useQuery(companyResultsQueries.period(scope, year, month));

  // Stepping the year can land the selected month in the future, where its tile is disabled; fall back to the whole year.
  const selectYear = useCallback((nextYear: number) => {
    setYear(nextYear);
    setMonth((current) => (current !== null && isFutureMonth(nextYear, current) ? null : current));
  }, []);

  useQueryReadFailureToast(query, 'companyResults.errors.loadFailed', showErrorToast, `${String(year)}-${month === null ? 'all' : String(month)}`);

  return { year, month, setYear: selectYear, setMonth, result: query.data ?? null, isLoading: query.isLoading };
}
