import { API_URL } from '../http/api-url';
import { apiClient } from '../http/api.client';
import type { SilentRequestOptions } from '../http/request-options';
import type {
  AppointmentDto,
  SchedulerCreateIntakeRequest,
  SchedulerCustomerLookupDto,
  UpdateAppointmentRequest,
  UpdateAppointmentVehicleRequest,
  UpdateStatusRequest,
} from '../../types/scheduler/scheduler.types';

export const appointmentService = {
  getAppointmentUpdatesUrl(): string {
    return `${API_URL}/api/appointments/updates`;
  },

  /** Searches customers with backend filtering by name and partial license-plate terms. */
  async findCustomersByName(name: string, limit = 10): Promise<SchedulerCustomerLookupDto[]> {
    const response = await apiClient.get<SchedulerCustomerLookupDto[]>('/api/customers/by-name', {
      params: { name, limit },
    });

    return response.data;
  },

  async createIntake(request: SchedulerCreateIntakeRequest): Promise<AppointmentDto> {
    const response = await apiClient.post<AppointmentDto>('/api/appointments/intake', request);
    return response.data;
  },

  async updateAppointment(id: number, request: UpdateAppointmentRequest): Promise<AppointmentDto> {
    const response = await apiClient.put<AppointmentDto>(`/api/appointments/${String(id)}`, request);
    return response.data;
  },

  async updateAppointmentVehicle(id: number, request: UpdateAppointmentVehicleRequest): Promise<AppointmentDto> {
    const response = await apiClient.put<AppointmentDto>(`/api/appointments/${String(id)}/vehicle`, request);
    return response.data;
  },

  async deleteAppointment(id: number): Promise<void> {
    await apiClient.delete(`/api/appointments/${String(id)}`);
  },

  async getByMonth(year: number, month: number, options?: SilentRequestOptions): Promise<AppointmentDto[]> {
    const response = await apiClient.get<AppointmentDto[]>('/api/appointments', {
      params: { year, month },
      skipErrorRedirect: options?.skipErrorRedirect,
    });
    return response.data;
  },

  async claim(id: number): Promise<AppointmentDto> {
    const response = await apiClient.put<AppointmentDto>(`/api/appointments/${String(id)}/claim`);
    return response.data;
  },

  async updateStatus(id: number, status: UpdateStatusRequest): Promise<AppointmentDto> {
    const response = await apiClient.put<AppointmentDto>(
      `/api/appointments/${String(id)}/status`,
      status,
    );
    return response.data;
  },

  async unclaim(id: number): Promise<AppointmentDto> {
    const response = await apiClient.delete<AppointmentDto>(`/api/appointments/${String(id)}/claim`);
    return response.data;
  },

  async adminAssign(id: number, mechanicId: number): Promise<AppointmentDto> {
    const response = await apiClient.put<AppointmentDto>(
      `/api/appointments/${String(id)}/assign/${String(mechanicId)}`,
    );
    return response.data;
  },

  async adminUnassign(id: number, mechanicId: number): Promise<AppointmentDto> {
    const response = await apiClient.delete<AppointmentDto>(
      `/api/appointments/${String(id)}/assign/${String(mechanicId)}`,
    );
    return response.data;
  },
};
