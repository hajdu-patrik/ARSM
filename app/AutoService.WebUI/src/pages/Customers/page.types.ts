import type { VehicleDetailDto } from '../../types/customers/customers.types';

/** Sort direction used by customer and history lists. */
export type SortDirection = 'asc' | 'desc';
/** Sortable customer list fields. */
export type CustomerSortField = 'name';
/** Mode for customer create/edit modal. */
export type CustomerModalMode = 'create' | 'edit';
/** Mode for vehicle create/edit modal. */
export type VehicleModalMode = 'create' | 'edit';

/** Customer form state used by create/edit modal. */
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
