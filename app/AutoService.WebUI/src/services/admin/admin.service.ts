/**
 * Admin service for mechanic management.
 *
 * Provides admin-only operations: mechanic registration, listing, and deletion.
 * All endpoints require admin authorization.
 * @module services/admin/admin.service
 */

import { apiClient } from '../http/api.client';

/**
 * Request payload for registering a new mechanic via {@code POST /api/auth/register}.
 */
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

/**
 * Response returned after successful mechanic registration.
 */
export interface RegisterMechanicResponse {
  /** Domain person identifier. */
  personId: number;
  /** Type of person (always {@code "mechanic"}). */
  personType: string;
  /** Registered email address. */
  email: string;
}

/**
 * Mechanic entry returned by the mechanic list endpoint
 * ({@code GET /api/admin/mechanics}).
 */
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

/**
 * Admin service object for mechanic management operations.
 */
export const adminService = {
  /**
   * Registers a new mechanic via {@code POST /api/auth/register}.
   * @param request - Mechanic registration details.
   * @returns The created mechanic's identity and profile data.
   */
  async registerMechanic(request: RegisterMechanicRequest): Promise<RegisterMechanicResponse> {
    const response = await apiClient.post<RegisterMechanicResponse>('/api/auth/register', {
      personType: 'mechanic',
      ...request,
    });
    return response.data;
  },

  /**
   * Fetches all registered mechanics via {@code GET /api/admin/mechanics}.
   * @returns Array of mechanic list items.
   */
  async listMechanics(): Promise<MechanicListItem[]> {
    const response = await apiClient.get<MechanicListItem[]>('/api/admin/mechanics');
    return response.data;
  },

  /**
   * Deletes a mechanic by person ID via {@code DELETE /api/admin/mechanics/{id}}.
   * May return {@code 422} if deletion invariants would be violated,
   * or {@code 409} on concurrent contention.
   * @param personId - The domain person ID of the mechanic to delete.
   */
  async deleteMechanic(personId: number): Promise<void> {
    await apiClient.delete(`/api/admin/mechanics/${personId}`);
  },
};
