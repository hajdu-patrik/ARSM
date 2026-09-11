/** API service for the part catalog. */

import { apiClient } from '../http/api.client';
import type { CreatePartRequest, PartDto, UpdatePartRequest } from '../../types/catalog/catalog.types';

/**
 * Part-catalog API service.
 *
 * Thin axios wrapper for {@code /api/parts}; the UI never calls HTTP directly.
 */
export const partService = {
  /** Returns all parts. */
  async listParts(): Promise<PartDto[]> {
    const response = await apiClient.get<PartDto[]>('/api/parts');
    return response.data;
  },

  /** Creates a part. */
  async createPart(request: CreatePartRequest): Promise<PartDto> {
    const response = await apiClient.post<PartDto>('/api/parts', request);
    return response.data;
  },

  /** Updates a part. */
  async updatePart(id: number, request: UpdatePartRequest): Promise<void> {
    await apiClient.put(`/api/parts/${id}`, request);
  },

  /** Deletes a part. */
  async deletePart(id: number): Promise<void> {
    await apiClient.delete(`/api/parts/${id}`);
  },
};
