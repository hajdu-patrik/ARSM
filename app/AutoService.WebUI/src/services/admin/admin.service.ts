/** Admin service for mechanic management; all endpoints require admin authorization. */

import type { CompanyProfileDto } from '../../types/admin/companyProfile.types';
import type { PagedQuery, PagedResult } from '../../types/common/pagination.types';
import { apiClient } from '../http/api.client';
import { toPageParams } from '../http/page-params';
import type { SilentRequestOptions } from '../http/request-options';

/** Request payload for registering a new mechanic via {@code POST /api/auth/register}. */
export interface RegisterMechanicRequest {
  /** Mechanic's first name. */
  firstName: string;
  /** Mechanic's middle name (optional). */
  middleName?: string | undefined;
  /** Mechanic's last name. */
  lastName: string;
  /** Email address for the new account. */
  email: string;
  /** Initial password for the new account. */
  password: string;
  /** Phone number (optional, Hungarian format). */
  phoneNumber?: string | undefined;
  /** Primary specialization area. */
  specialization: string;
  /** Additional expertise tags. */
  expertise: string[];
}

/** Response returned after successful mechanic registration. */
export interface RegisterMechanicResponse {
  /** Domain person identifier. */
  personId: number;
  /** Type of person (always {@code "mechanic"}). */
  personType: string;
  /** Registered email address. */
  email: string;
}

/** Mechanic entry returned by {@code GET /api/admin/mechanics}. */
export interface MechanicListItem {
  /** Domain person identifier. */
  personId: number;
  /** First name. */
  firstName: string;
  /** Middle name, or {@code null} if not set. */
  middleName: string | null;
  /** Last name. */
  lastName: string;
  /** Email address. */
  email: string;
  /** Phone number, or {@code null} if not set. */
  phoneNumber: string | null;
  /** Primary specialization area. */
  specialization: string;
  /** Whether the mechanic has an uploaded profile picture. */
  hasProfilePicture?: boolean | undefined;
  /** Whether this mechanic has admin privileges. */
  isAdmin: boolean;
}

/** Admin service object for mechanic management operations. */
export const adminService = {
  /** Registers a new mechanic via {@code POST /api/auth/register}. */
  async registerMechanic(request: RegisterMechanicRequest): Promise<RegisterMechanicResponse> {
    const response = await apiClient.post<RegisterMechanicResponse>('/api/auth/register', {
      personType: 'mechanic',
      ...request,
    });
    return response.data;
  },

  /** Fetches one page of mechanics (always ascending by name) via {@code GET /api/admin/mechanics}. */
  async listMechanics(query: PagedQuery, options?: SilentRequestOptions): Promise<PagedResult<MechanicListItem>> {
    const response = await apiClient.get<PagedResult<MechanicListItem>>('/api/admin/mechanics', {
      params: toPageParams(query),
      skipErrorRedirect: options?.skipErrorRedirect,
    });
    return response.data;
  },

  /** Deletes a mechanic via {@code DELETE /api/admin/mechanics/{id}}; may 422 (invariant) or 409 (contention). */
  async deleteMechanic(personId: number): Promise<void> {
    await apiClient.delete(`/api/admin/mechanics/${String(personId)}`);
  },

  /** Sets a temporary password via {@code POST /api/admin/mechanics/{id}/password-reset}; the mechanic must change it at the next login. */
  async resetMechanicPassword(personId: number, temporaryPassword: string): Promise<void> {
    await apiClient.post(`/api/admin/mechanics/${String(personId)}/password-reset`, { temporaryPassword });
  },

  /** Fetches the quote-PDF letterhead data via {@code GET /api/admin/company-profile}. */
  async getCompanyProfile(options?: SilentRequestOptions): Promise<CompanyProfileDto> {
    const response = await apiClient.get<CompanyProfileDto>('/api/admin/company-profile', {
      skipErrorRedirect: options?.skipErrorRedirect,
    });
    return response.data;
  },

  /** Saves the letterhead data via {@code PUT /api/admin/company-profile}; returns the normalized stored row. */
  async updateCompanyProfile(data: CompanyProfileDto): Promise<CompanyProfileDto> {
    const response = await apiClient.put<CompanyProfileDto>('/api/admin/company-profile', data);
    return response.data;
  },
};
