/** API service for the labor type catalog. */

import { apiClient } from '../http/api.client';
import type { SilentRequestOptions } from '../http/request-options';
import type { CreateLaborTypeRequest, LaborTypeDto, UpdateLaborTypeRequest } from '../../types/catalog/catalog.types';
import type { PagedQuery, PagedResult } from '../../types/common/pagination.types';
import { toPageParams } from '../http/page-params';

export const laborTypeService = {
  /** Returns one page of labor types; the server applies the search. */
  async listLaborTypes(query: PagedQuery, options?: SilentRequestOptions): Promise<PagedResult<LaborTypeDto>> {
    const response = await apiClient.get<PagedResult<LaborTypeDto>>('/api/labor-types', {
      params: toPageParams(query),
      skipErrorRedirect: options?.skipErrorRedirect,
    });
    return response.data;
  },

  async createLaborType(request: CreateLaborTypeRequest): Promise<LaborTypeDto> {
    const response = await apiClient.post<LaborTypeDto>('/api/labor-types', request);
    return response.data;
  },

  /** Returns one labor type with its current version. */
  async getLaborType(id: number): Promise<LaborTypeDto> {
    const response = await apiClient.get<LaborTypeDto>(`/api/labor-types/${String(id)}`);
    return response.data;
  },

  async updateLaborType(id: number, request: UpdateLaborTypeRequest): Promise<void> {
    await apiClient.put(`/api/labor-types/${String(id)}`, request);
  },

  async deleteLaborType(id: number): Promise<void> {
    await apiClient.delete(`/api/labor-types/${String(id)}`);
  },
};
