/** Profile service: CRUD for the authenticated user's profile, password changes and picture management. */

import { apiClient } from '../http/api.client';
import type {
  ProfileData,
  UpdateProfileRequest,
  ChangePasswordRequest,
  DeleteProfileRequest,
} from '../../types/profile/profile.types';

/** Base API URL for constructing direct resource URLs. */
const API_URL = import.meta.env.VITE_API_URL;

/** Profile service object for managing the authenticated user's profile. */
export const profileService = {
  /** Fetches the current user's profile data via {@code GET /api/profile}. */
  async getProfile(): Promise<ProfileData> {
    const response = await apiClient.get<ProfileData>('/api/profile/');
    return response.data;
  },

  /** Updates profile fields via {@code PUT /api/profile}. */
  async updateProfile(data: UpdateProfileRequest): Promise<ProfileData> {
    const response = await apiClient.put<ProfileData>('/api/profile/', data);
    return response.data;
  },

  /** Changes the user's password via {@code POST /api/profile/change-password}. */
  async changePassword(data: ChangePasswordRequest): Promise<void> {
    await apiClient.post('/api/profile/change-password', data);
  },

  /** Uploads a profile picture via {@code PUT /api/profile/picture} as multipart {@code FormData}. */
  async uploadProfilePicture(file: File): Promise<void> {
    const formData = new FormData();
    formData.append('file', file);
    await apiClient.put('/api/profile/picture', formData);
  },

  /** Deletes the current user's profile picture via {@code DELETE /api/profile/picture}. */
  async deleteProfilePicture(): Promise<void> {
    await apiClient.delete('/api/profile/picture');
  },

  /** Permanently deletes the user's account via {@code DELETE /api/profile}. */
  async deleteProfile(data: DeleteProfileRequest): Promise<void> {
    await apiClient.delete('/api/profile', { data });
  },

  /** Returns the direct URL for the current user's profile picture. */
  getProfilePictureUrl(): string {
    return `${API_URL}/api/profile/picture`;
  },

  /** Returns the direct URL for a specific mechanic's profile picture. */
  getMechanicProfilePictureUrl(personId: number): string {
    return `${API_URL}/api/profile/picture/${personId}`;
  },

  /** Returns the SSE endpoint URL for real-time profile picture update events. */
  getProfilePictureUpdatesUrl(): string {
    return `${API_URL}/api/profile/picture/updates`;
  },
};
