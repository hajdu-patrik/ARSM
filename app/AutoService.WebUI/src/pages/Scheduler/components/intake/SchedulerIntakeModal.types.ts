import type { DrivetrainType } from '../../../../types/customers/customers.types';

export type LookupMode = 'licensePlate' | 'name';
export type LookupState = 'idle' | 'found' | 'not-found' | 'name-results';
export type VehicleMode = 'existing' | 'new';

export interface IntakeApiError {
  detail?: string;
}

export interface VehicleFormState {
  licensePlate: string;
  vin: string;
  brand: string;
  model: string;
  year: string;
  mileageKm: string;
  enginePowerKw: string;
  drivetrainType: DrivetrainType | '';
}

export const EMPTY_VEHICLE: VehicleFormState = {
  licensePlate: '',
  vin: '',
  brand: '',
  model: '',
  year: '',
  mileageKm: '',
  enginePowerKw: '',
  drivetrainType: '',
};

export const VEHICLE_NUMERIC_LIMITS = {
  mileageKm: { min: 0, max: 1000000 },
  enginePowerKw: { min: 0, max: 50000 },
} as const;
