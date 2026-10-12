/** API service for quotes. */

import { apiClient } from '../http/api.client';
import type { SilentRequestOptions } from '../http/request-options';
import type {
  ChangeQuoteStatusRequest,
  CreateQuoteRequest,
  ExtendQuoteValidityRequest,
  QuoteDetailDto,
  QuoteLineRequest,
  QuoteListItemDto,
  QuoteListQuery,
  UpdateQuoteRequest,
} from '../../types/quotes/quotes.types';
import type { PagedResult } from '../../types/common/pagination.types';
import { toPageParams } from '../http/page-params';

/** Reads the file name out of a Content-Disposition header, or null when absent/unparsable. */
function parseContentDispositionFileName(disposition: unknown): string | null {
  if (typeof disposition !== 'string') {
    return null;
  }

  const rawFileName = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition)?.[1];
  if (rawFileName === undefined) {
    return null;
  }

  try {
    return decodeURIComponent(rawFileName.trim());
  } catch {
    return null;
  }
}

/** Thin axios wrapper for {@code /api/quotes}; every write carries the version the client last saw, as a
 * query param on the two DELETE routes since a DELETE has no body. */
export const quoteService = {
  /** Returns one page of quotes, newest first; the server applies the search, status and expired filters. */
  async listQuotes(query: QuoteListQuery, options?: SilentRequestOptions): Promise<PagedResult<QuoteListItemDto>> {
    const response = await apiClient.get<PagedResult<QuoteListItemDto>>('/api/quotes', {
      params: {
        ...toPageParams(query),
        status: query.status,
        expired: query.expired,
        vehicleId: query.vehicleId,
      },
      skipErrorRedirect: options?.skipErrorRedirect,
    });
    return response.data;
  },

  /** Returns one quote with its lines and totals. */
  async getQuote(id: number, options?: SilentRequestOptions): Promise<QuoteDetailDto> {
    const response = await apiClient.get<QuoteDetailDto>(`/api/quotes/${String(id)}`, {
      skipErrorRedirect: options?.skipErrorRedirect,
    });
    return response.data;
  },

  /** Creates a draft quote anchored to a vehicle. */
  async createQuote(vehicleId: number, request: CreateQuoteRequest): Promise<QuoteDetailDto> {
    const response = await apiClient.post<QuoteDetailDto>(`/api/vehicles/${String(vehicleId)}/quotes`, request);
    return response.data;
  },

  /** Updates a draft quote header. */
  async updateQuote(id: number, request: UpdateQuoteRequest): Promise<QuoteDetailDto> {
    const response = await apiClient.put<QuoteDetailDto>(`/api/quotes/${String(id)}`, request);
    return response.data;
  },

  /** Deletes a draft quote. */
  async deleteQuote(id: number, version: number): Promise<void> {
    await apiClient.delete(`/api/quotes/${String(id)}`, { params: { version } });
  },

  /** Adds a line to a draft quote and returns the recalculated quote. */
  async addLine(id: number, request: QuoteLineRequest): Promise<QuoteDetailDto> {
    const response = await apiClient.post<QuoteDetailDto>(`/api/quotes/${String(id)}/lines`, request);
    return response.data;
  },

  /** Updates one line of a draft quote and returns the recalculated quote. */
  async updateLine(id: number, lineId: number, request: QuoteLineRequest): Promise<QuoteDetailDto> {
    const response = await apiClient.put<QuoteDetailDto>(`/api/quotes/${String(id)}/lines/${String(lineId)}`, request);
    return response.data;
  },

  /** Removes one line from a draft quote and returns the recalculated quote. */
  async deleteLine(id: number, lineId: number, version: number): Promise<QuoteDetailDto> {
    const response = await apiClient.delete<QuoteDetailDto>(`/api/quotes/${String(id)}/lines/${String(lineId)}`, {
      params: { version },
    });
    return response.data;
  },

  /** Transitions a quote to a new status. */
  async changeStatus(id: number, request: ChangeQuoteStatusRequest): Promise<QuoteDetailDto> {
    const response = await apiClient.post<QuoteDetailDto>(`/api/quotes/${String(id)}/status`, request);
    return response.data;
  },

  /** Downloads the quote as a PDF blob; the file name comes from Content-Disposition, or null if unparsable. */
  async downloadPdf(id: number): Promise<{ blob: Blob; fileName: string | null }> {
    const response = await apiClient.get<Blob>(`/api/quotes/${String(id)}/pdf`, { responseType: 'blob' });
    const disposition: unknown = response.headers['content-disposition'];

    return { blob: response.data, fileName: parseContentDispositionFileName(disposition) };
  },

  /** Extends a quote's validity deadline. */
  async extendValidity(id: number, request: ExtendQuoteValidityRequest): Promise<QuoteDetailDto> {
    const response = await apiClient.put<QuoteDetailDto>(`/api/quotes/${String(id)}/valid-until`, request);
    return response.data;
  },
};
