/**
 * Customer page helper utilities.
 *
 * Provides data transformation, validation mapping, and formatting helpers
 * for the customer registry page.
 * @module pages/Customers/helpers
 */

import { DRIVETRAIN_TYPES, type CustomerListItem, type DrivetrainType } from '../../types/customers/customers.types';
import type { ServerFieldErrors } from '../../utils/serverValidation';

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

/**
 * Builds full customer display name from customer row data.
 * Returns last-first-middle name order with whitespace-trimmed parts.
 * @param customer Customer row data.
 * @returns Full name in last-first-middle order.
 */
export function buildCustomerDisplayName(customer: CustomerListItem): string {
  return [customer.lastName, customer.firstName, customer.middleName]
    .filter((value) => value && value.trim().length > 0)
    .join(' ');
}

/**
 * Removes accents and lowercases input to support accent-insensitive search.
 * @param value Raw input value.
 * @returns Normalized value suitable for contains matching.
 */
export function normalizeSearchValue(value: string): string {
  return value
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Formats a timestamp string to locale-aware date-time text.
 * @param value ISO timestamp.
 * @param locale Current i18n locale.
 * @returns Human-readable date-time text.
 */
export function formatDateTime(value: string, locale: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Maps customer-validation messages to i18n keys.
 * @param message Backend error detail.
 * @returns Customer page i18n key.
 */
export function mapCustomerValidationMessageToKey(message: string): string {
  const normalized = message.trim().toLowerCase();

  if (normalized.includes('already exists') && normalized.includes('email')) {
    return 'customers.errors.emailExists';
  }

  if (normalized.includes('already exists') && normalized.includes('phone')) {
    return 'customers.errors.phoneExists';
  }

  if (normalized.includes('email must be a valid email address')) {
    return 'customers.errors.invalidEmail';
  }

  if (normalized.includes('phone number must be a valid european number')) {
    return 'customers.errors.invalidPhone';
  }

  if (normalized.includes('may only contain letters and hyphens')) {
    return 'customers.errors.invalidName';
  }

  if (normalized.includes('required') || normalized.includes('must not be blank')) {
    return 'customers.errors.fieldRequired';
  }

  if (normalized.includes('customer not found')) {
    return 'customers.errors.customerNotFound';
  }

  return 'customers.errors.saveFailed';
}

/**
 * Maps vehicle-validation messages to i18n keys.
 * @param message Backend error detail.
 * @returns Vehicle-related i18n key.
 */
export function mapVehicleValidationMessageToKey(message: string): string {
  const normalized = message.trim().toLowerCase();

  if (normalized.includes('license plate format is invalid')) {
    return 'customers.errors.vehicleLicensePlateInvalid';
  }

  if (normalized.includes('vehicle with this license plate already exists')) {
    return 'customers.errors.vehicleLicensePlateExists';
  }

  if (normalized.includes('vin')) {
    return 'customers.errors.vehicleVinInvalid';
  }

  if (normalized.includes('drivetrain')) {
    return 'customers.errors.vehicleDrivetrainInvalid';
  }

  if (normalized.includes('year must be between')) {
    return 'customers.errors.vehicleYearInvalid';
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
    return 'customers.errors.fieldRequired';
  }

  return 'customers.errors.vehicleSaveFailed';
}

/**
 * Returns true when the server field-error dictionary has at least one non-empty entry.
 * @param errors Server field errors dictionary.
 * @returns True if any field has validation errors.
 */
export function hasServerFieldErrors(errors: ServerFieldErrors): boolean {
  return Object.values(errors).some((messages) => messages.length > 0);
}

/**
 * Parses numeric vehicle form inputs into numbers for payload construction.
 * @param form Vehicle form state with string-typed numeric fields.
 * @returns Parsed numeric values.
 */
export function parseVehicleNumericValues(form: VehicleFormState): VehicleNumericValues {
  return {
    year: Number(form.year),
    mileageKm: Number(form.mileageKm),
    enginePowerKw: Number(form.enginePowerKw),
  };
}

export function isDrivetrainType(value: string): value is DrivetrainType {
  return (DRIVETRAIN_TYPES as readonly string[]).includes(value);
}

/**
 * Builds inline numeric field errors for invalid vehicle number inputs.
 * @param values Parsed numeric values from vehicle form.
 * @returns Server field errors dictionary with NaN detection.
 */
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

/**
 * Status badge style mapper for repair history rows.
 * @param status Appointment status string.
 * @returns Tailwind class name for badge appearance.
 */
export function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'Completed':
      return 'bg-arsm-success-soft text-arsm-success-text dark:bg-arsm-success-bg-dark dark:text-arsm-success-text-dark';
    case 'Cancelled':
      return 'bg-arsm-error-soft text-arsm-error-text dark:bg-arsm-error-bg-dark dark:text-arsm-error-text-light';
    default:
      return 'bg-arsm-warning-bg text-arsm-warning-text dark:bg-arsm-warning-bg-dark dark:text-arsm-warning-text-dark';
  }
}
