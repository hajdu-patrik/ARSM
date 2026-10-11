/** API service for the labor type catalog. */

import { apiClient } from '../http/api.client';
import type { SilentRequestOptions } from '../http/request-options';
import type { CreateLaborTypeRequest, LaborTypeDto, UpdateLaborTypeRequest } from '../../types/catalog/catalog.types';

/** Labor-type-catalog API service; a thin axios wrapper for {@code /api/labor-types}. */
export const laborTypeService = {
  /** Returns all labor types. */
  async listLaborTypes(options?: SilentRequestOptions): Promise<LaborTypeDto[]> {
    const response = await apiClient.get<LaborTypeDto[]>('/api/labor-types', {
      skipErrorRedirect: options?.skipErrorRedirect,
    });
    return response.data;
  },

  /** Creates a labor type. */
  async createLaborType(request: CreateLaborTypeRequest): Promise<LaborTypeDto> {
    const response = await apiClient.post<LaborTypeDto>('/api/labor-types', request);
    return response.data;
  },

  /** Updates a labor type. */
  async updateLaborType(id: number, request: UpdateLaborTypeRequest): Promise<void> {
    await apiClient.put(`/api/labor-types/${String(id)}`, request);
  },

  /** Deletes a labor type. */
  async deleteLaborType(id: number): Promise<void> {
    await apiClient.delete(`/api/labor-types/${String(id)}`);
  },
};
