/**
 * SchedulerIntakeModal.types.ts
 *
 * Auto-generated documentation header for this source file.
 */

import type { SchedulerCustomerLookupDto } from '../../../../types/scheduler/scheduler.types';

export type LookupState = 'idle' | 'found' | 'not-found';
export type VehicleMode = 'existing' | 'new';

export interface IntakeApiError {
  detail?: string;
}

export interface VehicleFormState {
  licensePlate: string;
  brand: string;
  model: string;
  year: string;
  mileageKm: string;
  enginePowerHp: string;
  engineTorqueNm: string;
}

export interface SchedulerIntakeFormState {
  lookupState: LookupState;
  customerLookup: SchedulerCustomerLookupDto | null;
  email: string;
  customerFirstName: string;
  customerMiddleName: string;
  customerLastName: string;
  customerPhone: string;
  taskDescription: string;
  dueDateTime: string;
  vehicleMode: VehicleMode;
  existingVehicleId: string;
  vehicle: VehicleFormState;
  isSearching: boolean;
  isSubmitting: boolean;
  errorKey: string | null;
}

export const EMPTY_VEHICLE: VehicleFormState = {
  licensePlate: '',
  brand: '',
  model: '',
  year: '',
  mileageKm: '',
  enginePowerHp: '',
  engineTorqueNm: '',
};

export const VEHICLE_NUMERIC_LIMITS = {
  mileageKm: { min: 0, max: 1000000 },
  enginePowerHp: { min: 0, max: 50000 },
  engineTorqueNm: { min: 0, max: 50000 },
} as const;
