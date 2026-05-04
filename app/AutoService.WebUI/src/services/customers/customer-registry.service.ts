/** API service for customer registry, vehicles, and repair-history queries. */

import { apiClient } from '../http/api.client';
import type { AppointmentDto } from '../../types/scheduler/scheduler.types';
import type {
  CreateCustomerRequest,
  CreateVehicleRequest,
  CustomerListItem,
  UpdateCustomerRequest,
  UpdateVehicleRequest,
  VehicleDetailDto,
} from '../../types/customers/customers.types';

/**
 * Customer-registry API service.
 *
 * Aggregates customer CRUD, vehicle CRUD, and customer/vehicle history queries
 * used by the customers page.
 */
export const customerRegistryService = {
  /** Returns all customers. */
  async listCustomers(): Promise<CustomerListItem[]> {
    const response = await apiClient.get<CustomerListItem[]>('/api/customers');
    return response.data;
  },

  /** Creates a customer. */
  async createCustomer(request: CreateCustomerRequest): Promise<CustomerListItem> {
    const response = await apiClient.post<CustomerListItem>('/api/customers', request);
    return response.data;
  },

  /** Updates a customer. */
  async updateCustomer(id: number, request: UpdateCustomerRequest): Promise<void> {
    await apiClient.put(`/api/customers/${id}`, request);
  },

  /** Deletes a customer. */
  async deleteCustomer(id: number): Promise<void> {
    await apiClient.delete(`/api/customers/${id}`);
  },

  /** Returns all vehicles belonging to a customer. */
  async listVehicles(customerId: number): Promise<VehicleDetailDto[]> {
    const response = await apiClient.get<VehicleDetailDto[]>(`/api/customers/${customerId}/vehicles`);
    return response.data;
  },

  /** Creates a vehicle for a customer. */
  async createVehicle(customerId: number, request: CreateVehicleRequest): Promise<VehicleDetailDto> {
    const response = await apiClient.post<VehicleDetailDto>(`/api/customers/${customerId}/vehicles`, request);
    return response.data;
  },

  /** Updates an existing vehicle. */
  async updateVehicle(id: number, request: UpdateVehicleRequest): Promise<void> {
    await apiClient.put(`/api/vehicles/${id}`, request);
  },

  /** Deletes a vehicle. */
  async deleteVehicle(id: number): Promise<void> {
    await apiClient.delete(`/api/vehicles/${id}`);
  },

  /** Returns repair history for all appointments of a customer. */
  async getCustomerHistory(customerId: number, descending = false): Promise<AppointmentDto[]> {
    const response = await apiClient.get<AppointmentDto[]>(`/api/customers/${customerId}/appointments`, {
      params: { descending },
    });
    return response.data;
  },

  /** Returns repair history for all appointments of a vehicle. */
  async getVehicleHistory(vehicleId: number, descending = false): Promise<AppointmentDto[]> {
    const response = await apiClient.get<AppointmentDto[]>(`/api/vehicles/${vehicleId}/appointments`, {
      params: { descending },
    });
    return response.data;
  },
};
