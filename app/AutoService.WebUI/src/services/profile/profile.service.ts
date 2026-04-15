/**
 * Profile management service.
 *
 * Provides CRUD operations for the authenticated user's profile,
 * including personal info updates, password changes, profile picture
 * management, and account deletion.
 * @module services/profile/profile.service
 */

import { apiClient } from '../http/api.client';
import type {
  ProfileData,
  UpdateProfileRequest,
  ChangePasswordRequest,
  DeleteProfileRequest,
} from '../../types/profile/profile.types';

/** Base API URL for constructing direct resource URLs. */
const API_URL = import.meta.env.VITE_API_URL;

/**
 * Profile service object for managing the authenticated user's profile.
 */
export const profileService = {
  /**
   * Fetches the current user's profile data via {@code GET /api/profile}.
   * @returns The authenticated user's profile.
   */
  async getProfile(): Promise<ProfileData> {
    const response = await apiClient.get<ProfileData>('/api/profile/');
    return response.data;
  },

  /**
   * Updates profile fields via {@code PUT /api/profile}.
   * @param data - Partial profile update payload.
   * @returns The updated profile data.
   */
  async updateProfile(data: UpdateProfileRequest): Promise<ProfileData> {
    const response = await apiClient.put<ProfileData>('/api/profile/', data);
    return response.data;
  },

  /**
   * Changes the user's password via {@code POST /api/profile/change-password}.
   * @param data - Current and new password payload.
   */
  async changePassword(data: ChangePasswordRequest): Promise<void> {
    await apiClient.post('/api/profile/change-password', data);
  },

  /**
   * Uploads a profile picture via {@code PUT /api/profile/picture}.
   * Sends the file as multipart {@code FormData}.
   * @param file - The image file to upload.
   */
  async uploadProfilePicture(file: File): Promise<void> {
    const formData = new FormData();
    formData.append('file', file);
    await apiClient.put('/api/profile/picture', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  /**
   * Deletes the current user's profile picture via {@code DELETE /api/profile/picture}.
   */
  async deleteProfilePicture(): Promise<void> {
    await apiClient.delete('/api/profile/picture');
  },

  /**
   * Permanently deletes the user's account via {@code DELETE /api/profile}.
   * @param data - Password confirmation for account deletion.
   */
  async deleteProfile(data: DeleteProfileRequest): Promise<void> {
    await apiClient.delete('/api/profile', { data });
  },

  /**
   * Returns the direct URL for the current user's profile picture.
   * @returns Absolute URL to the profile picture endpoint.
   */
  getProfilePictureUrl(): string {
    return `${API_URL}/api/profile/picture`;
  },

  /**
   * Returns the direct URL for a specific mechanic's profile picture.
   * @param personId - The domain person ID of the mechanic.
   * @returns Absolute URL to the mechanic's profile picture endpoint.
   */
  getMechanicProfilePictureUrl(personId: number): string {
    return `${API_URL}/api/profile/picture/${personId}`;
  },

  /**
   * Returns the SSE endpoint URL for real-time profile picture update events.
   * @returns Absolute URL to the profile picture updates SSE stream.
   */
  getProfilePictureUpdatesUrl(): string {
    return `${API_URL}/api/profile/picture/updates`;
  },
};
