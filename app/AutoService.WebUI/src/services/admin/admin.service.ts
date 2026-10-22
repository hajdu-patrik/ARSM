/** Admin service for mechanic management; all endpoints require admin authorization. */

import type { CompanyProfileDto } from '../../types/admin/companyProfile.types';
import type { PagedQuery, PagedResult } from '../../types/common/pagination.types';
import { apiClient } from '../http/api.client';
import { toPageParams } from '../http/page-params';
import type { SilentRequestOptions } from '../http/request-options';

export interface RegisterMechanicRequest {
  firstName: string;
  middleName?: string | undefined;
  lastName: string;
  email: string;
  password: string;
  phoneNumber?: string | undefined;
  specialization: string;
  expertise: string[];
}

export interface RegisterMechanicResponse {
  personId: number;
  /** Type of person (always `"mechanic"`). */
  personType: string;
  email: string;
}

/** Mechanic entry returned by `GET /api/admin/mechanics`. */
export interface MechanicListItem {
  personId: number;
  firstName: string;
  middleName: string | null;
  lastName: string;
  email: string;
  phoneNumber: string | null;
  specialization: string;
  hasProfilePicture?: boolean | undefined;
  isAdmin: boolean;
}

export const adminService = {
  async registerMechanic(request: RegisterMechanicRequest): Promise<RegisterMechanicResponse> {
    const response = await apiClient.post<RegisterMechanicResponse>('/api/auth/register', {
      personType: 'mechanic',
      ...request,
    });
    return response.data;
  },

  /** Fetches one page of mechanics (always ascending by name) via `GET /api/admin/mechanics`. */
  async listMechanics(query: PagedQuery, options?: SilentRequestOptions): Promise<PagedResult<MechanicListItem>> {
    const response = await apiClient.get<PagedResult<MechanicListItem>>('/api/admin/mechanics', {
      params: toPageParams(query),
      skipErrorRedirect: options?.skipErrorRedirect,
    });
    return response.data;
  },

  /** Deletes a mechanic via `DELETE /api/admin/mechanics/{id}`; may 422 (invariant) or 409 (contention). */
  async deleteMechanic(personId: number): Promise<void> {
    await apiClient.delete(`/api/admin/mechanics/${String(personId)}`);
  },

  /** Sets a temporary password via `POST /api/admin/mechanics/{id}/password-reset`; the mechanic must change it at the next login. */
  async resetMechanicPassword(personId: number, temporaryPassword: string): Promise<void> {
    await apiClient.post(`/api/admin/mechanics/${String(personId)}/password-reset`, { temporaryPassword });
  },

  /** Fetches the quote-PDF letterhead data via `GET /api/admin/company-profile`. */
  async getCompanyProfile(options?: SilentRequestOptions): Promise<CompanyProfileDto> {
    const response = await apiClient.get<CompanyProfileDto>('/api/admin/company-profile', {
      skipErrorRedirect: options?.skipErrorRedirect,
    });
    return response.data;
  },

  /** Saves the letterhead data via `PUT /api/admin/company-profile`; returns the normalized stored row. */
  async updateCompanyProfile(data: CompanyProfileDto): Promise<CompanyProfileDto> {
    const response = await apiClient.put<CompanyProfileDto>('/api/admin/company-profile', data);
    return response.data;
  },
};
