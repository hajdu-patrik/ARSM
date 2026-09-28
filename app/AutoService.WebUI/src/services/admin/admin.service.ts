/** Admin service for mechanic management; all endpoints require admin authorization. */

import { apiClient } from '../http/api.client';

/** Request payload for registering a new mechanic via {@code POST /api/auth/register}. */
export interface RegisterMechanicRequest {
  /** Mechanic's first name. */
  firstName: string;
  /** Mechanic's middle name (optional). */
  middleName?: string;
  /** Mechanic's last name. */
  lastName: string;
  /** Email address for the new account. */
  email: string;
  /** Initial password for the new account. */
  password: string;
  /** Phone number (optional, Hungarian format). */
  phoneNumber?: string;
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
  hasProfilePicture?: boolean;
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

  /** Fetches all registered mechanics via {@code GET /api/admin/mechanics}. */
  async listMechanics(): Promise<MechanicListItem[]> {
    const response = await apiClient.get<MechanicListItem[]>('/api/admin/mechanics');
    return response.data;
  },

  /** Deletes a mechanic via {@code DELETE /api/admin/mechanics/{id}}; may 422 (invariant) or 409 (contention). */
  async deleteMechanic(personId: number): Promise<void> {
    await apiClient.delete(`/api/admin/mechanics/${personId}`);
  },
};
