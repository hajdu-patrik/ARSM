import { COMPANY_RESULTS_STALE_TIME_MS } from '../cache/cache-policy';
import { queryKeys, type AuthQueryScope } from '../cache/queryKeys';
import { companyResultService } from '../reporting/company-result.service';
import { scopedQueryOptions } from './scopedQueryOptions';

export const companyResultsQueries = {
  /** The report for a year, or for one month of it (month 1-12, null for the whole year). */
  period: (scope: AuthQueryScope | null, year: number, month: number | null) =>
    scopedQueryOptions(
      scope,
      (authScope) => queryKeys.companyResults.period(authScope, year, month),
      (request) => companyResultService.getCompanyResults(year, month, request),
      COMPANY_RESULTS_STALE_TIME_MS,
    ),
};
