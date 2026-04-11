import { apiClient } from '../http/api.client';
import type {
  ProfileData,
  UpdateProfileRequest,
  ChangePasswordRequest,
  DeleteProfileRequest,
} from '../../types/profile/profile.types';

const API_URL = import.meta.env.VITE_API_URL;

export const profileService = {
  async getProfile(): Promise<ProfileData> {
    const response = await apiClient.get<ProfileData>('/api/profile/');
    return response.data;
  },

  async updateProfile(data: UpdateProfileRequest): Promise<ProfileData> {
    const response = await apiClient.put<ProfileData>('/api/profile/', data);
    return response.data;
  },

  async changePassword(data: ChangePasswordRequest): Promise<void> {
    await apiClient.post('/api/profile/change-password', data);
  },

  async uploadProfilePicture(file: File): Promise<void> {
    const formData = new FormData();
    formData.append('file', file);
    await apiClient.put('/api/profile/picture', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  async deleteProfilePicture(): Promise<void> {
    await apiClient.delete('/api/profile/picture');
  },

  async deleteProfile(data: DeleteProfileRequest): Promise<void> {
    await apiClient.delete('/api/profile', { data });
  },

  getProfilePictureUrl(): string {
    return `${API_URL}/api/profile/picture`;
  },

  getMechanicProfilePictureUrl(personId: number): string {
    return `${API_URL}/api/profile/picture/${personId}`;
  },

  getProfilePictureUpdatesUrl(): string {
    return `${API_URL}/api/profile/picture/updates`;
  },
};
