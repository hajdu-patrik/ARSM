import type { VehicleDetailDto } from '../../types/customers/customers.types';

export type SortDirection = 'asc' | 'desc';
export type CustomerSortField = 'name' | 'vehicleCount';
export type CustomerModalMode = 'create' | 'edit';
export type VehicleModalMode = 'create' | 'edit';

export interface CustomerFormState {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
}

export interface DeleteVehicleTarget {
  customerId: number;
  vehicle: VehicleDetailDto;
}
