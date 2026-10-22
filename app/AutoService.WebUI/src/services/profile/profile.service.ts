/** Profile service: CRUD for the authenticated user's profile, password changes and picture management. */

import { API_URL } from '../http/api-url';
import { apiClient } from '../http/api.client';
import type { SilentRequestOptions } from '../http/request-options';
import type {
  ProfileData,
  UpdateProfileRequest,
  ChangePasswordRequest,
  DeleteProfileRequest,
} from '../../types/profile/profile.types';

export const profileService = {
  async getProfile(options?: SilentRequestOptions): Promise<ProfileData> {
    const response = await apiClient.get<ProfileData>('/api/profile/', {
      skipErrorRedirect: options?.skipErrorRedirect,
    });
    return response.data;
  },

  async updateProfile(data: UpdateProfileRequest): Promise<ProfileData> {
    const response = await apiClient.put<ProfileData>('/api/profile/', data);
    return response.data;
  },

  async changePassword(data: ChangePasswordRequest): Promise<void> {
    await apiClient.post('/api/profile/change-password', data);
  },

  /** Uploads a profile picture via `PUT /api/profile/picture` as multipart `FormData`. */
  async uploadProfilePicture(file: File): Promise<void> {
    const formData = new FormData();
    formData.append('file', file);
    await apiClient.put('/api/profile/picture', formData);
  },

  async deleteProfilePicture(): Promise<void> {
    await apiClient.delete('/api/profile/picture');
  },

  /** Permanently deletes the user's account via `DELETE /api/profile`. */
  async deleteProfile(data: DeleteProfileRequest): Promise<void> {
    await apiClient.delete('/api/profile', { data });
  },

  getProfilePictureUrl(): string {
    return `${API_URL}/api/profile/picture`;
  },

  getMechanicProfilePictureUrl(personId: number): string {
    return `${API_URL}/api/profile/picture/${String(personId)}`;
  },

  getProfilePictureUpdatesUrl(): string {
    return `${API_URL}/api/profile/picture/updates`;
  },
};
