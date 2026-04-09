import { apiClient } from './api.client';
import type {
  AppointmentDto,
  SchedulerCreateIntakeRequest,
  SchedulerCustomerLookupDto,
  UpdateAppointmentRequest,
  UpdateStatusRequest,
} from '../types/scheduler.types';

export const appointmentService = {
  async findCustomerByEmail(email: string): Promise<SchedulerCustomerLookupDto | null> {
    try {
      const response = await apiClient.get<SchedulerCustomerLookupDto>('/api/customers/by-email', {
        params: { email },
      });

      return response.data;
    } catch (error) {
      if (isNotFoundError(error)) {
        return null;
      }

      throw error;
    }
  },

  async createIntake(request: SchedulerCreateIntakeRequest): Promise<AppointmentDto> {
    const response = await apiClient.post<AppointmentDto>('/api/appointments/intake', request);
    return response.data;
  },

  async updateAppointment(id: number, request: UpdateAppointmentRequest): Promise<AppointmentDto> {
    const response = await apiClient.put<AppointmentDto>(`/api/appointments/${id}`, request);
    return response.data;
  },

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

function isNotFoundError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('response' in error)) {
    return false;
  }

  const maybeResponse = (error as { response?: { status?: number } }).response;
  return maybeResponse?.status === 404;
}