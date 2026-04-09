import { apiClient } from './api.client';
import type { AppointmentDto, UpdateStatusRequest } from '../types/scheduler.types';

export const appointmentService = {
  async getByMonth(year: number, month: number): Promise<AppointmentDto[]> {
    const response = await apiClient.get<AppointmentDto[]>('/api/appointments', {
      params: { year, month },
    });
    return response.data;
  },

  async getToday(): Promise<AppointmentDto[]> {
    const response = await apiClient.get<AppointmentDto[]>('/api/appointments/today');
    return response.data;
  },

  async claim(id: number): Promise<AppointmentDto> {
    const response = await apiClient.put<AppointmentDto>(`/api/appointments/${id}/claim`);
    return response.data;
  },

  async updateStatus(id: number, status: UpdateStatusRequest): Promise<AppointmentDto> {
    const response = await apiClient.put<AppointmentDto>(
      `/api/appointments/${id}/status`,
      status
    );
    return response.data;
  },

  async unclaim(id: number): Promise<AppointmentDto> {
    const response = await apiClient.delete<AppointmentDto>(`/api/appointments/${id}/claim`);
    return response.data;
  },

  async adminAssign(id: number, mechanicId: number): Promise<AppointmentDto> {
    const response = await apiClient.put<AppointmentDto>(`/api/appointments/${id}/assign/${mechanicId}`);
    return response.data;
  },

  async adminUnassign(id: number, mechanicId: number): Promise<AppointmentDto> {
    const response = await apiClient.delete<AppointmentDto>(`/api/appointments/${id}/assign/${mechanicId}`);
    return response.data;
  },
};