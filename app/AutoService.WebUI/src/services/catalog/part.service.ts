/** API service for the part catalog. */

import { apiClient } from '../http/api.client';
import type { SilentRequestOptions } from '../http/request-options';
import type { CreatePartRequest, PartDto, UpdatePartRequest } from '../../types/catalog/catalog.types';

/** Part-catalog API service; a thin axios wrapper for {@code /api/parts}. */
export const partService = {
  /** Returns all parts. */
  async listParts(options?: SilentRequestOptions): Promise<PartDto[]> {
    const response = await apiClient.get<PartDto[]>('/api/parts', {
      skipErrorRedirect: options?.skipErrorRedirect,
    });
    return response.data;
  },

  /** Creates a part. */
  async createPart(request: CreatePartRequest): Promise<PartDto> {
    const response = await apiClient.post<PartDto>('/api/parts', request);
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
