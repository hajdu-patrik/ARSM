/** API service for quotes. */

import { apiClient } from '../http/api.client';
import type {
  ChangeQuoteStatusRequest,
  CreateQuoteRequest,
  ExtendQuoteValidityRequest,
  QuoteDetailDto,
  QuoteLineRequest,
  QuoteListItemDto,
  UpdateQuoteRequest,
} from '../../types/quotes/quotes.types';

/** Reads the file name out of a Content-Disposition header, or null when absent/unparsable. */
function parseContentDispositionFileName(disposition: unknown): string | null {
  if (typeof disposition !== 'string') {
    return null;
  }

  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
  return match ? decodeURIComponent(match[1].trim()) : null;
}

/** Thin axios wrapper for {@code /api/quotes}; every write carries the version the client last saw, as a
 * query param on the two DELETE routes since a DELETE has no body. */
export const quoteService = {
  /** Returns every quote, newest first; status/expiry filtering stays client-side (`isExpired` is computed, see WebUI CLAUDE.md). */
  async listQuotes(): Promise<QuoteListItemDto[]> {
    const response = await apiClient.get<QuoteListItemDto[]>('/api/quotes');
    return response.data;
  },

  /** Returns one quote with its lines and totals. */
  async getQuote(id: number): Promise<QuoteDetailDto> {
    const response = await apiClient.get<QuoteDetailDto>(`/api/quotes/${id}`);
    return response.data;
  },

  /** Creates a draft quote anchored to a vehicle. */
  async createQuote(vehicleId: number, request: CreateQuoteRequest): Promise<QuoteDetailDto> {
    const response = await apiClient.post<QuoteDetailDto>(`/api/vehicles/${vehicleId}/quotes`, request);
    return response.data;
  },

  /** Updates a draft quote header. */
  async updateQuote(id: number, request: UpdateQuoteRequest): Promise<QuoteDetailDto> {
    const response = await apiClient.put<QuoteDetailDto>(`/api/quotes/${id}`, request);
    return response.data;
  },

  /** Deletes a draft quote. */
  async deleteQuote(id: number, version: number): Promise<void> {
    await apiClient.delete(`/api/quotes/${id}`, { params: { version } });
  },

  /** Adds a line to a draft quote and returns the recalculated quote. */
  async addLine(id: number, request: QuoteLineRequest): Promise<QuoteDetailDto> {
    const response = await apiClient.post<QuoteDetailDto>(`/api/quotes/${id}/lines`, request);
    return response.data;
  },

  /** Updates one line of a draft quote and returns the recalculated quote. */
  async updateLine(id: number, lineId: number, request: QuoteLineRequest): Promise<QuoteDetailDto> {
    const response = await apiClient.put<QuoteDetailDto>(`/api/quotes/${id}/lines/${lineId}`, request);
    return response.data;
  },

  /** Removes one line from a draft quote and returns the recalculated quote. */
  async deleteLine(id: number, lineId: number, version: number): Promise<QuoteDetailDto> {
    const response = await apiClient.delete<QuoteDetailDto>(`/api/quotes/${id}/lines/${lineId}`, {
      params: { version },
    });
    return response.data;
  },

  /** Transitions a quote to a new status. */
  async changeStatus(id: number, request: ChangeQuoteStatusRequest): Promise<QuoteDetailDto> {
    const response = await apiClient.post<QuoteDetailDto>(`/api/quotes/${id}/status`, request);
    return response.data;
  },

  /** Downloads the quote as a PDF blob; the file name comes from Content-Disposition, or null if unparsable. */
  async downloadPdf(id: number): Promise<{ blob: Blob; fileName: string | null }> {
    const response = await apiClient.get<Blob>(`/api/quotes/${id}/pdf`, { responseType: 'blob' });
    const disposition = response.headers['content-disposition'];

    return { blob: response.data, fileName: parseContentDispositionFileName(disposition) };
  },

  /** Extends a quote's validity deadline. */
  async extendValidity(id: number, request: ExtendQuoteValidityRequest): Promise<QuoteDetailDto> {
    const response = await apiClient.put<QuoteDetailDto>(`/api/quotes/${id}/valid-until`, request);
    return response.data;
  },
};
