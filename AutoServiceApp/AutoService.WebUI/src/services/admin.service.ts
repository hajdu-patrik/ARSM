import { apiClient } from './api.client';

export interface RegisterMechanicRequest {
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  password: string;
  phoneNumber?: string;
  specialization: string;
  expertise: string[];
}

export interface RegisterMechanicResponse {
  identityUserId: string;
  personId: number;
  personType: string;
  email: string;
}

export interface MechanicListItem {
  personId: number;
  firstName: string;
  middleName: string | null;
  lastName: string;
  email: string;
  phoneNumber: string | null;
  specialization: string;
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

  async listMechanics(): Promise<MechanicListItem[]> {
    const response = await apiClient.get<MechanicListItem[]>('/api/admin/mechanics');
    return response.data;
  },

  async deleteMechanic(personId: number): Promise<void> {
    await apiClient.delete(`/api/admin/mechanics/${personId}`);
  },
};
