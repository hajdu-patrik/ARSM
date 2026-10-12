/** API service for customer registry, vehicles, and repair-history queries. */

import { apiClient } from '../http/api.client';
import { toPageParams } from '../http/page-params';
import type { SilentRequestOptions } from '../http/request-options';
import type { PagedQuery, PagedResult } from '../../types/common/pagination.types';
import type { AppointmentDto } from '../../types/scheduler/scheduler.types';
import type {
  CreateCustomerRequest,
  CreateVehicleRequest,
  CustomerListItem,
  UpdateCustomerRequest,
  UpdateVehicleRequest,
  VehicleDetailDto,
} from '../../types/customers/customers.types';

/** Customer-registry API service: customer CRUD, vehicle CRUD, and customer/vehicle history queries. */
export const customerRegistryService = {
  /** Returns one page of customers (name ascending), optionally filtered by names and license plates. */
  async listCustomers(query: PagedQuery, options?: SilentRequestOptions): Promise<PagedResult<CustomerListItem>> {
    const response = await apiClient.get<PagedResult<CustomerListItem>>('/api/customers', {
      params: toPageParams(query),
      skipErrorRedirect: options?.skipErrorRedirect,
    });
    return response.data;
  },

  /** Creates a customer. */
  async createCustomer(request: CreateCustomerRequest): Promise<CustomerListItem> {
    const response = await apiClient.post<CustomerListItem>('/api/customers', request);
    return response.data;
  },

  /** Updates a customer. */
  async updateCustomer(id: number, request: UpdateCustomerRequest): Promise<void> {
    await apiClient.put(`/api/customers/${String(id)}`, request);
  },

  /** Deletes a customer. */
  async deleteCustomer(id: number): Promise<void> {
    await apiClient.delete(`/api/customers/${String(id)}`);
  },

  /** Returns one vehicle with its owner summary. */
  async getVehicle(id: number, options?: SilentRequestOptions): Promise<VehicleDetailDto> {
    const response = await apiClient.get<VehicleDetailDto>(`/api/vehicles/${String(id)}`, {
      skipErrorRedirect: options?.skipErrorRedirect,
    });
    return response.data;
  },

  /** Returns one page of the vehicles belonging to a customer. */
  async listVehicles(
    customerId: number,
    query: PagedQuery,
    options?: SilentRequestOptions,
  ): Promise<PagedResult<VehicleDetailDto>> {
    const response = await apiClient.get<PagedResult<VehicleDetailDto>>(`/api/customers/${String(customerId)}/vehicles`, {
      params: { page: query.page, pageSize: query.pageSize },
      skipErrorRedirect: options?.skipErrorRedirect,
    });
    return response.data;
  },

  /** Creates a vehicle for a customer. */
  async createVehicle(customerId: number, request: CreateVehicleRequest): Promise<VehicleDetailDto> {
    const response = await apiClient.post<VehicleDetailDto>(
      `/api/customers/${String(customerId)}/vehicles`,
      request,
    );
    return response.data;
  },

  /** Updates an existing vehicle. */
  async updateVehicle(id: number, request: UpdateVehicleRequest): Promise<void> {
    await apiClient.put(`/api/vehicles/${String(id)}`, request);
  },

  /** Deletes a vehicle. */
  async deleteVehicle(id: number): Promise<void> {
    await apiClient.delete(`/api/vehicles/${String(id)}`);
  },

  /** Returns repair history for all appointments of a customer. */
  async getCustomerHistory(
    customerId: number,
    descending = false,
    options?: SilentRequestOptions,
  ): Promise<AppointmentDto[]> {
    const response = await apiClient.get<AppointmentDto[]>(`/api/customers/${String(customerId)}/appointments`, {
      params: { descending },
      skipErrorRedirect: options?.skipErrorRedirect,
    });
    return response.data;
  },

  /** Returns repair history for all appointments of a vehicle. */
  async getVehicleHistory(
    vehicleId: number,
    descending = false,
    options?: SilentRequestOptions,
  ): Promise<AppointmentDto[]> {
    const response = await apiClient.get<AppointmentDto[]>(`/api/vehicles/${String(vehicleId)}/appointments`, {
      params: { descending },
      skipErrorRedirect: options?.skipErrorRedirect,
    });
    return response.data;
  },
};
