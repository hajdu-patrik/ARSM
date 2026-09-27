/**
 * Scheduler appointment API service.
 * @module services/scheduler/appointment.service
 */

import { apiClient } from '../http/api.client';
import type {
  AppointmentDto,
  SchedulerCreateIntakeRequest,
  SchedulerCustomerLookupDto,
  UpdateAppointmentRequest,
  UpdateAppointmentVehicleRequest,
  UpdateStatusRequest,
} from '../../types/scheduler/scheduler.types';

/** Base API URL for constructing direct resource URLs. */
const API_URL = import.meta.env.VITE_API_URL;

/** Per-call options for read endpoints that can also run as a silent background refresh. */
interface SilentRequestOptions {
  /** When {@code true}, opts this request out of the global 500 redirect (background/polling call). */
  readonly skipErrorRedirect?: boolean;
}

/**
 * Appointment service object for all scheduler-related API operations.
 */
export const appointmentService = {
  /**
   * Returns the SSE endpoint URL for real-time appointment update events.
   * @returns Absolute URL to the appointment updates SSE stream.
   */
  getAppointmentUpdatesUrl(): string {
    return `${API_URL}/api/appointments/updates`;
  },

  /**
   * Looks up a customer by email via {@code GET /api/customers/by-email}.
   * @param email - The email address to search for.
   * @returns The customer data with vehicles, or {@code null} if not found.
   */
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

  /**
   * Looks up a customer by exact vehicle license plate.
   * @param licensePlate - License plate to match exactly on the backend.
   * @returns The matched customer and vehicle context, or {@code null} if not found.
   */
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

  /**
   * Searches customers with backend filtering by name and partial license-plate terms.
   * @param name - Search fragment forwarded to the lookup endpoint.
   * @param limit - Maximum number of results to request.
   * @returns Matching customers with vehicle summaries.
   */
  async findCustomersByName(name: string, limit = 10): Promise<SchedulerCustomerLookupDto[]> {
    const response = await apiClient.get<SchedulerCustomerLookupDto[]>('/api/customers/by-name', {
      params: { name, limit },
    });

    return response.data;
  },

  /**
   * Creates a new appointment intake via {@code POST /api/appointments/intake}.
   * @param request - Intake details including customer, vehicle, and scheduling info.
   * @returns The newly created appointment.
   */
  async createIntake(request: SchedulerCreateIntakeRequest): Promise<AppointmentDto> {
    const response = await apiClient.post<AppointmentDto>('/api/appointments/intake', request);
    return response.data;
  },

  /**
   * Updates an existing appointment via {@code PUT /api/appointments/{id}}.
   * @param id - The appointment ID.
   * @param request - Updated appointment fields.
   * @returns The updated appointment.
   */
  async updateAppointment(id: number, request: UpdateAppointmentRequest): Promise<AppointmentDto> {
    const response = await apiClient.put<AppointmentDto>(`/api/appointments/${id}`, request);
    return response.data;
  },

  /**
   * Updates appointment vehicle details via {@code PUT /api/appointments/{id}/vehicle}.
   * @param id - The appointment ID.
   * @param request - Updated vehicle fields.
   * @returns The updated appointment.
   */
  async updateAppointmentVehicle(id: number, request: UpdateAppointmentVehicleRequest): Promise<AppointmentDto> {
    const response = await apiClient.put<AppointmentDto>(`/api/appointments/${id}/vehicle`, request);
    return response.data;
  },

  /**
   * Fetches appointments for a given month via {@code GET /api/appointments}.
   * @param year - Calendar year.
   * @param month - Calendar month (1–12).
   * @param options - Optional silent-request settings for background refresh callers.
   * @returns Array of appointments in the specified month.
   */
  async getByMonth(year: number, month: number, options?: SilentRequestOptions): Promise<AppointmentDto[]> {
    const response = await apiClient.get<AppointmentDto[]>('/api/appointments', {
      params: { year, month },
      skipErrorRedirect: options?.skipErrorRedirect,
    });
    return response.data;
  },

  /**
   * Fetches today's appointments via {@code GET /api/appointments/today}.
   * @param options - Optional silent-request settings for background refresh callers.
   * @returns Array of appointments scheduled for today.
   */
  async getToday(options?: SilentRequestOptions): Promise<AppointmentDto[]> {
    const response = await apiClient.get<AppointmentDto[]>('/api/appointments/today', {
      skipErrorRedirect: options?.skipErrorRedirect,
    });
    return response.data;
  },

  /**
   * Claims an appointment for the current mechanic via {@code PUT /api/appointments/{id}/claim}.
   * @param id - The appointment ID to claim.
   * @returns The updated appointment with the current mechanic assigned.
   */
  async claim(id: number): Promise<AppointmentDto> {
    const response = await apiClient.put<AppointmentDto>(`/api/appointments/${id}/claim`);
    return response.data;
  },

  /**
   * Updates an appointment's lifecycle status via {@code PUT /api/appointments/{id}/status}.
   * @param id - The appointment ID.
   * @param status - The target status.
   * @returns The updated appointment.
   */
  async updateStatus(id: number, status: UpdateStatusRequest): Promise<AppointmentDto> {
    const response = await apiClient.put<AppointmentDto>(
      `/api/appointments/${id}/status`,
      status,
    );
    return response.data;
  },

  /**
   * Unclaims the current mechanic from an appointment via {@code DELETE /api/appointments/{id}/claim}.
   * @param id - The appointment ID to unclaim.
   * @returns The updated appointment without the current mechanic.
   */
  async unclaim(id: number): Promise<AppointmentDto> {
    const response = await apiClient.delete<AppointmentDto>(`/api/appointments/${id}/claim`);
    return response.data;
  },

  /**
   * Admin-assigns a mechanic to an appointment via {@code PUT /api/appointments/{id}/assign/{mechanicId}}.
   * @param id - The appointment ID.
   * @param mechanicId - The person ID of the mechanic to assign.
   * @returns The updated appointment with the mechanic added.
   */
  async adminAssign(id: number, mechanicId: number): Promise<AppointmentDto> {
    const response = await apiClient.put<AppointmentDto>(`/api/appointments/${id}/assign/${mechanicId}`);
    return response.data;
  },

  /**
   * Admin-unassigns a mechanic from an appointment via {@code DELETE /api/appointments/{id}/assign/{mechanicId}}.
   * @param id - The appointment ID.
   * @param mechanicId - The person ID of the mechanic to remove.
   * @returns The updated appointment with the mechanic removed.
   */
  async adminUnassign(id: number, mechanicId: number): Promise<AppointmentDto> {
    const response = await apiClient.delete<AppointmentDto>(`/api/appointments/${id}/assign/${mechanicId}`);
    return response.data;
  },
};

/**
 * Checks whether an error is an HTTP 404 Not Found response.
 * @param error - The caught error to inspect.
 * @returns {@code true} if the error has a 404 response status.
 */
function isNotFoundError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('response' in error)) {
    return false;
  }

  const maybeResponse = (error as { response?: { status?: number } }).response;
  return maybeResponse?.status === 404;
}