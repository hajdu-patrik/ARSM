/** API service for the company result report. */

import { apiClient } from '../http/api.client';
import type { CompanyResultDto } from '../../types/reporting/company-results.types';

/**
 * Company-result API service.
 *
 * Thin axios wrapper for {@code /api/company-results}; the UI never calls HTTP
 * directly. The month parameter is omitted rather than sent as null, because
 * an absent month is what asks the API for the whole year.
 */
export const companyResultService = {
  /** Returns the revenue report for a year, or for one month of it. */
  async getCompanyResults(year: number, month: number | null): Promise<CompanyResultDto> {
    const response = await apiClient.get<CompanyResultDto>('/api/company-results', {
      params: month === null ? { year } : { year, month },
    });
    return response.data;
  },
};
