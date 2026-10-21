/** Customer page helper utilities: data transformation, validation mapping, and formatting for the registry page. */

import { DRIVETRAIN_TYPES, type CustomerListItem, type DrivetrainType } from '../../types/customers/customers.types';
import type { AppointmentDto } from '../../types/scheduler/scheduler.types';
import type { ServerFieldErrors } from '../../utils/serverValidation';
import type { SortDirection } from './page.types';

/** Structured numeric values extracted from vehicle form inputs. */
export interface VehicleNumericValues {
  readonly year: number;
  readonly mileageKm: number;
  readonly enginePowerKw: number;
}

/** Vehicle form state shape for create/edit modals. */
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

/** Builds a customer's full display name in last-first-middle order, trimmed. */
export function buildCustomerDisplayName(customer: CustomerListItem): string {
  return [customer.lastName, customer.firstName, customer.middleName]
    .filter((value) => value && value.trim().length > 0)
    .join(' ');
}

/** Orders a history the server returned ascending: as received for ascending, reversed for descending. */
export function orderRepairHistory(appointments: AppointmentDto[], direction: SortDirection): AppointmentDto[] {
  return direction === 'asc' ? appointments : [...appointments].reverse();
}

/** Maps customer-validation messages to i18n keys. */
export function mapCustomerValidationMessageToKey(message: string): string {
  const normalized = message.trim().toLowerCase();

  if (normalized.includes('already exists') && normalized.includes('email')) {
    return 'customers.errors.emailExists';
  }

  if (normalized.includes('already exists') && normalized.includes('phone')) {
    return 'customers.errors.phoneExists';
  }

  if (normalized.includes('email must be a valid email address')) {
    return 'common.validation.invalidEmail';
  }

  if (normalized.includes('phone number must be a valid european number')) {
    return 'common.validation.invalidPhone';
  }

  if (normalized.includes('may only contain letters and hyphens')) {
    return 'common.validation.invalidName';
  }

  if (normalized.includes('required') || normalized.includes('must not be blank')) {
    return 'common.validation.fieldRequired';
  }

  if (normalized.includes('customer not found')) {
    return 'customers.errors.customerNotFound';
  }

  return 'customers.errors.saveFailed';
}

/** Maps vehicle-validation messages to i18n keys. */
export function mapVehicleValidationMessageToKey(message: string): string {
  const normalized = message.trim().toLowerCase();

  if (normalized.includes('license plate format is invalid')) {
    return 'common.validation.licensePlateInvalid';
  }

  if (normalized.includes('vehicle with this license plate already exists')) {
    return 'customers.errors.vehicleLicensePlateExists';
  }

  if (normalized.includes('vin')) {
    return 'common.validation.vehicleVinInvalid';
  }

  if (normalized.includes('drivetrain')) {
    return 'common.validation.vehicleDrivetrainInvalid';
  }

  if (normalized.includes('year must be between')) {
    return 'common.validation.vehicleYearInvalid';
  }

  if (normalized.includes('must be non-negative')) {
    return 'customers.errors.vehicleNumberInvalid';
  }

  if (normalized.includes('vehicle not found')) {
    return 'customers.errors.vehicleNotFound';
  }

  if (normalized.includes('customer not found')) {
    return 'customers.errors.customerNotFound';
  }

  if (normalized.includes('required') || normalized.includes('must not be blank')) {
    return 'common.validation.fieldRequired';
  }

  return 'customers.errors.vehicleSaveFailed';
}

/** Parses numeric vehicle form inputs into numbers for payload construction. */
export function parseVehicleNumericValues(form: VehicleFormState): VehicleNumericValues {
  return {
    year: Number(form.year),
    mileageKm: Number(form.mileageKm),
    enginePowerKw: Number(form.enginePowerKw),
  };
}

/** Narrows a form string to one of the known drivetrain types. */
export function isDrivetrainType(value: string): value is DrivetrainType {
  return (DRIVETRAIN_TYPES as readonly string[]).includes(value);
}

/** Builds inline numeric field errors for invalid (NaN) vehicle number inputs. */
export function buildVehicleNumericFieldErrors(values: VehicleNumericValues): ServerFieldErrors {
  const numericFields = [
    ['Year', values.year],
    ['MileageKm', values.mileageKm],
    ['EnginePowerKw', values.enginePowerKw],
  ] as const;

  const errors: ServerFieldErrors = {};
  for (const [field, value] of numericFields) {
    if (Number.isNaN(value)) {
      errors[field] = ['customers.errors.vehicleNumberInvalid'];
    }
  }

  return errors;
}
