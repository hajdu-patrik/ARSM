/** API service for the part catalog. */

import { apiClient } from '../http/api.client';
import type { SilentRequestOptions } from '../http/request-options';
import type { CreatePartRequest, PartDto, UpdatePartRequest } from '../../types/catalog/catalog.types';
import type { PagedQuery, PagedResult } from '../../types/common/pagination.types';
import { toPageParams } from '../http/page-params';

/** Part-catalog API service; a thin axios wrapper for `/api/parts`. */
export const partService = {
  /** Returns one page of parts; the server applies the search. */
  async listParts(query: PagedQuery, options?: SilentRequestOptions): Promise<PagedResult<PartDto>> {
    const response = await apiClient.get<PagedResult<PartDto>>('/api/parts', {
      params: toPageParams(query),
      skipErrorRedirect: options?.skipErrorRedirect,
    });
    return response.data;
  },

  /** Creates a part. */
  async createPart(request: CreatePartRequest): Promise<PartDto> {
    const response = await apiClient.post<PartDto>('/api/parts', request);
    return response.data;
  },

  /** Returns one part with its current version. */
  async getPart(id: number): Promise<PartDto> {
    const response = await apiClient.get<PartDto>(`/api/parts/${String(id)}`);
    return response.data;
  },

  /** Updates a part. */
  async updatePart(id: number, request: UpdatePartRequest): Promise<void> {
    await apiClient.put(`/api/parts/${String(id)}`, request);
  },

  /** Deletes a part. */
  async deletePart(id: number): Promise<void> {
    await apiClient.delete(`/api/parts/${String(id)}`);
  },
};
