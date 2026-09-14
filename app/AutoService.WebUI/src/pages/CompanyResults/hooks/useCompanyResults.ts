/**
 * Company result page state: the selected period and the report behind it.
 *
 * The report is cached per period through the authenticated query cache, so
 * stepping back to a period already looked at is instant, and a month that
 * holds no quotes still renders — the API answers with zeros rather than 404.
 * @module pages/CompanyResults/hooks/useCompanyResults
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { CompanyResultDto } from '../../../types/reporting/company-results.types';
import { companyResultService } from '../../../services/reporting/company-result.service';
import { COMPANY_RESULTS_STALE_TIME_MS, PERSISTED_QUERY_CACHE_MAX_AGE_MS } from '../../../services/cache/cache-policy';
import { getAuthQueryScope, queryKeys } from '../../../services/cache/queryKeys';
import { useAuthStore } from '../../../store/auth.store';

/** External dependencies for the company result hook. */
interface UseCompanyResultsParams {
  showErrorToast: (key: string) => void;
}

/**
 * Loads the revenue report for the selected period.
 * @param params Localized error toast handler.
 * @returns The report, the loading flag, and the period selection.
 */
export function useCompanyResults({ showErrorToast }: UseCompanyResultsParams) {
  const queryClient = useQueryClient();
  const authUser = useAuthStore((state) => state.user);
  const authScope = useMemo(() => getAuthQueryScope(authUser), [authUser]);
  const [year, setYear] = useState(() => new Date().getUTCFullYear());
  const [month, setMonth] = useState<number | null>(null);
  const [result, setResult] = useState<CompanyResultDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!authScope) {
      setResult(null);
      setIsLoading(false);
      return;
    }

    const key = queryKeys.companyResults.period(authScope, year, month);
    const cached = queryClient.getQueryData<CompanyResultDto>(key);

    if (cached) {
      setResult(cached);
    }

    setIsLoading(!cached);

    try {
      const data = await queryClient.fetchQuery({
        gcTime: PERSISTED_QUERY_CACHE_MAX_AGE_MS,
        queryFn: () => companyResultService.getCompanyResults(year, month),
        queryKey: key,
        staleTime: COMPANY_RESULTS_STALE_TIME_MS,
      });
      setResult(data);
    } catch {
      if (!cached) {
        showErrorToast('companyResults.errors.loadFailed');
      }
    } finally {
      setIsLoading(false);
    }
  }, [authScope, month, queryClient, showErrorToast, year]);

  useEffect(() => {
    void load();
  }, [load]);

  return { year, month, setYear, setMonth, result, isLoading };
}

/** Company result state returned by {@link useCompanyResults}. */
export type CompanyResultsState = ReturnType<typeof useCompanyResults>;
