/** Scheduler appointment API service. */

import axios from 'axios';
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

/** Checks whether an error is an HTTP 404 Not Found response. */
function isNotFoundError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 404;
}

/** Appointment service object for all scheduler-related API operations. */
export const appointmentService = {
  /** Returns the SSE endpoint URL for real-time appointment update events. */
  getAppointmentUpdatesUrl(): string {
    return `${API_URL}/api/appointments/updates`;
  },

  /** Looks up a customer by email via {@code GET /api/customers/by-email}; null when not found. */
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

  /** Looks up a customer by exact vehicle license plate; null when not found. */
  async findCustomerByLicensePlate(licensePlate: string): Promise<SchedulerCustomerLookupDto | null> {
    try {
      const response = await apiClient.get<SchedulerCustomerLookupDto>('/api/customers/by-license-plate', {
        params: { licensePlate },
      });

      return response.data;
    } catch (error) {
      if (isNotFoundError(error)) {
        return null;
      }

      throw error;
    }
  },

  /** Searches customers with backend filtering by name and partial license-plate terms. */
  async findCustomersByName(name: string, limit = 10): Promise<SchedulerCustomerLookupDto[]> {
    const response = await apiClient.get<SchedulerCustomerLookupDto[]>('/api/customers/by-name', {
      params: { name, limit },
    });

    return response.data;
  },

  /** Creates a new appointment intake via {@code POST /api/appointments/intake}. */
  async createIntake(request: SchedulerCreateIntakeRequest): Promise<AppointmentDto> {
    const response = await apiClient.post<AppointmentDto>('/api/appointments/intake', request);
    return response.data;
  },

  /** Updates an existing appointment via {@code PUT /api/appointments/{id}}. */
  async updateAppointment(id: number, request: UpdateAppointmentRequest): Promise<AppointmentDto> {
    const response = await apiClient.put<AppointmentDto>(`/api/appointments/${String(id)}`, request);
    return response.data;
  },

  /** Updates appointment vehicle details via {@code PUT /api/appointments/{id}/vehicle}. */
  async updateAppointmentVehicle(id: number, request: UpdateAppointmentVehicleRequest): Promise<AppointmentDto> {
    const response = await apiClient.put<AppointmentDto>(`/api/appointments/${String(id)}/vehicle`, request);
    return response.data;
  },

  /** Deletes an appointment via {@code DELETE /api/appointments/{id}}. */
  async deleteAppointment(id: number): Promise<void> {
    await apiClient.delete(`/api/appointments/${String(id)}`);
  },

  /** Fetches appointments for a given month via {@code GET /api/appointments}. */
  async getByMonth(year: number, month: number, options?: SilentRequestOptions): Promise<AppointmentDto[]> {
    const response = await apiClient.get<AppointmentDto[]>('/api/appointments', {
      params: { year, month },
      skipErrorRedirect: options?.skipErrorRedirect,
    });
    return response.data;
  },

  /** Fetches today's appointments via {@code GET /api/appointments/today}. */
  async getToday(options?: SilentRequestOptions): Promise<AppointmentDto[]> {
    const response = await apiClient.get<AppointmentDto[]>('/api/appointments/today', {
      skipErrorRedirect: options?.skipErrorRedirect,
    });
    return response.data;
  },

  /** Claims an appointment for the current mechanic via {@code PUT /api/appointments/{id}/claim}. */
  async claim(id: number): Promise<AppointmentDto> {
    const response = await apiClient.put<AppointmentDto>(`/api/appointments/${String(id)}/claim`);
    return response.data;
  },

  /** Updates an appointment's lifecycle status via {@code PUT /api/appointments/{id}/status}. */
  async updateStatus(id: number, status: UpdateStatusRequest): Promise<AppointmentDto> {
    const response = await apiClient.put<AppointmentDto>(
      `/api/appointments/${String(id)}/status`,
      status,
    );
    return response.data;
  },

  /** Unclaims the current mechanic from an appointment via {@code DELETE /api/appointments/{id}/claim}. */
  async unclaim(id: number): Promise<AppointmentDto> {
    const response = await apiClient.delete<AppointmentDto>(`/api/appointments/${String(id)}/claim`);
    return response.data;
  },

  /** Admin-assigns a mechanic to an appointment via {@code PUT /api/appointments/{id}/assign/{mechanicId}}. */
  async adminAssign(id: number, mechanicId: number): Promise<AppointmentDto> {
    const response = await apiClient.put<AppointmentDto>(
      `/api/appointments/${String(id)}/assign/${String(mechanicId)}`,
    );
    return response.data;
  },

  /** Admin-unassigns a mechanic from an appointment via {@code DELETE /api/appointments/{id}/assign/{mechanicId}}. */
  async adminUnassign(id: number, mechanicId: number): Promise<AppointmentDto> {
    const response = await apiClient.delete<AppointmentDto>(
      `/api/appointments/${String(id)}/assign/${String(mechanicId)}`,
    );
    return response.data;
  },
};
