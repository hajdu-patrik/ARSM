import type { VehicleDetailDto } from '../../types/customers/customers.types';

/** Sort direction used by customer and history lists. */
export type SortDirection = 'asc' | 'desc';
export type CustomerModalMode = 'create' | 'edit';
export type VehicleModalMode = 'create' | 'edit';

export interface CustomerFormState {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
}

/** Vehicle deletion context storing parent customer and selected vehicle. */
export interface DeleteVehicleTarget {
  customerId: number;
  vehicle: VehicleDetailDto;
}
