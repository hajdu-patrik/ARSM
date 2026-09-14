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

/**
 * Reads the file name out of a Content-Disposition header.
 * @param disposition Raw header value, when the response carried one.
 * @returns The file name, or null when the header is absent or has none.
 */
function parseContentDispositionFileName(disposition: unknown): string | null {
  if (typeof disposition !== 'string') {
    return null;
  }

  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
  return match ? decodeURIComponent(match[1].trim()) : null;
}

/**
 * Quote API service.
 *
 * Thin axios wrapper for {@code /api/quotes} and the vehicle-nested quote
 * routes; the UI never calls HTTP directly. Every write takes the version
 * the client last saw, and the two delete routes carry it as a query
 * parameter because a DELETE has no body.
 */
export const quoteService = {
  /**
   * Returns every quote, newest first. Status and expiry filtering stays on
   * the client: `isExpired` is a computed response flag rather than a stored
   * status, so one list read serves every filter chip without a round trip.
   */
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

  /**
   * Downloads the quote as a PDF. The response is binary, so it is requested
   * as a blob; the file name comes from the Content-Disposition header the API
   * sets, and is null when the header is missing or unparsable.
   */
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
