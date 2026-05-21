import { isAxiosError } from 'axios';
import { DRIVETRAIN_TYPES } from '../../../../types/customers/customers.types';
import type {
  SchedulerCreateIntakeRequest,
  SchedulerNewVehicleRequest,
} from '../../../../types/scheduler/scheduler.types';
import { buildSelectedDayIso, toDatetimeLocalValue } from '../../utils/due-date';
import type {
  IntakeApiError,
  LookupState,
  VehicleFormState,
  VehicleMode,
} from './SchedulerIntakeModal.types';
import { VEHICLE_NUMERIC_LIMITS } from './SchedulerIntakeModal.types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isIntakeApiError(value: unknown): value is IntakeApiError {
  if (!isRecord(value)) {
    return false;
  }

  return value.detail == null || typeof value.detail === 'string';
}

const INTAKE_ERROR_TERM_MAP: ReadonlyArray<{ readonly term: string; readonly key: string }> = [
  { term: 'invalid email', key: 'scheduler.intake.errors.invalidEmail' },
  { term: 'taskdescription is required', key: 'scheduler.intake.errors.taskRequired' },
  { term: 'duedatetime must be greater than or equal to scheduleddate', key: 'scheduler.intake.errors.dueBeforeScheduled' },
  { term: 'customerfirstname and customerlastname are required', key: 'scheduler.intake.errors.customerNameRequired' },
  { term: 'phone number must be a valid european number', key: 'scheduler.intake.errors.invalidPhone' },
  { term: 'vehicle with this license plate already exists', key: 'scheduler.intake.errors.licensePlateExists' },
  { term: 'vehicle with this vin already exists', key: 'scheduler.intake.errors.vehicleVinInvalid' },
  { term: 'vin', key: 'scheduler.intake.errors.vehicleVinInvalid' },
  { term: 'drivetrain', key: 'scheduler.intake.errors.vehicleDrivetrainInvalid' },
  { term: 'license plate', key: 'scheduler.intake.errors.licensePlateInvalid' },
  { term: 'vehicle.year must be between 1886 and 2100', key: 'scheduler.intake.errors.vehicleYearInvalid' },
  { term: 'must be non-negative', key: 'scheduler.intake.errors.vehicleNumberInvalid' },
  { term: 'scheduleddate cannot be in the past', key: 'scheduler.intake.errors.scheduledInPast' },
  { term: 'already exists', key: 'scheduler.intake.errors.conflictData' },
  { term: 'unable to create intake', key: 'scheduler.intake.errors.conflictData' },
];

function getIntakeErrorDetail(error: unknown): string {
  if (!isAxiosError(error) || !isIntakeApiError(error.response?.data)) {
    return '';
  }

  return error.response.data.detail?.toLowerCase() ?? '';
}

function matchesAnyDetailTerm(detail: string, terms: readonly string[]): boolean {
  return terms.some((term) => detail.includes(term));
}

export function getDefaultScheduledDate(selectedDate: Date): string {
  const now = new Date();
  return toDatetimeLocalValue(
    buildSelectedDayIso(
      selectedDate.getFullYear(),
      selectedDate.getMonth() + 1,
      selectedDate.getDate(),
      now.getHours(),
      now.getMinutes(),
    ),
  );
}

export function getDefaultDueDate(selectedDate: Date): string {
  const next = new Date(selectedDate);
  next.setDate(selectedDate.getDate() + 3);

  return toDatetimeLocalValue(
    buildSelectedDayIso(
      next.getFullYear(),
      next.getMonth() + 1,
      next.getDate(),
      17,
    ),
  );
}

/**
 * Maps a known backend intake error to a localized frontend message key.
 *
 * Checks are evaluated in priority order: duplicate license plate is tested
 * before the generic license plate pattern to ensure the correct i18n key is
 * returned when both strings would otherwise match.
 *
 * @param error - The caught error value from an intake API call.
 * @returns A dot-separated i18n key string for the matching error condition,
 *   falling back to `'scheduler.intake.errors.createFailed'` for unknown errors.
 */
export function mapIntakeErrorToKey(error: unknown): string {
  const detail = getIntakeErrorDetail(error);

  for (const { term, key } of INTAKE_ERROR_TERM_MAP) {
    if (detail.includes(term)) {
      return key;
    }
  }

  if (matchesAnyDetailTerm(detail, ['invalid first name', 'invalid last name', 'invalid middle name'])) {
    return 'scheduler.intake.errors.invalidName';
  }

  if (detail.includes('vehicle.') && detail.includes('required')) {
    return 'scheduler.intake.errors.vehicleRequiredFields';
  }

  return 'scheduler.intake.errors.createFailed';
}

export function toIso(value: string): string {
  return new Date(value).toISOString();
}

export function buildVehiclePayload(vehicle: VehicleFormState): SchedulerNewVehicleRequest {
  return {
    licensePlate: vehicle.licensePlate.trim(),
    vin: vehicle.vin.trim(),
    brand: vehicle.brand.trim(),
    model: vehicle.model.trim(),
    year: Number(vehicle.year),
    mileageKm: Number(vehicle.mileageKm),
    enginePowerKw: Number(vehicle.enginePowerKw),
    drivetrainType: vehicle.drivetrainType || 'Petrol',
  };
}

export function normalizeRangedNumberInput(rawValue: string, min: number, max: number): string {
  if (rawValue.trim() === '') {
    return '';
  }

  const parsed = Number(rawValue);
  if (Number.isNaN(parsed)) {
    return '';
  }

  const clamped = Math.min(max, Math.max(min, parsed));
  return String(clamped);
}

export function hasValidVehicleNumericValues(vehicle: VehicleFormState): boolean {
  const mileageKm = Number(vehicle.mileageKm);
  const enginePowerKw = Number(vehicle.enginePowerKw);

  return !(
    Number.isNaN(mileageKm) || mileageKm < VEHICLE_NUMERIC_LIMITS.mileageKm.min || mileageKm > VEHICLE_NUMERIC_LIMITS.mileageKm.max ||
    Number.isNaN(enginePowerKw) || enginePowerKw < VEHICLE_NUMERIC_LIMITS.enginePowerKw.min || enginePowerKw > VEHICLE_NUMERIC_LIMITS.enginePowerKw.max
  );
}

export function hasRequiredVehicleTextValues(vehicle: VehicleFormState): boolean {
  return vehicle.licensePlate.trim().length > 0
    && vehicle.vin.trim().length > 0
    && vehicle.brand.trim().length > 0
    && vehicle.model.trim().length > 0
    && (DRIVETRAIN_TYPES as readonly string[]).includes(vehicle.drivetrainType);
}

/**
 * Validates intake form state before constructing the API request payload.
 */
export function getCreateValidationError(params: {
  lookupState: LookupState;
  normalizedEmail: string;
  dueDateTime: string;
  selectedDate: Date;
  autoScheduledDate: string;
  taskDescription: string;
  shouldShowVehicleCreate: boolean;
  vehicle: VehicleFormState;
}): string | null {
  if (params.lookupState === 'idle') {
    return 'scheduler.intake.errors.searchRequired';
  }

  if (!params.normalizedEmail) {
    return 'scheduler.intake.errors.emailRequired';
  }

  if (!params.dueDateTime) {
    return 'scheduler.intake.errors.dueRequired';
  }

  if (new Date(params.dueDateTime).getTime() < new Date(params.autoScheduledDate).getTime()) {
    return 'scheduler.intake.errors.dueBeforeScheduled';
  }

  if (!params.taskDescription.trim()) {
    return 'scheduler.intake.errors.taskRequired';
  }

  if (params.shouldShowVehicleCreate && !hasRequiredVehicleTextValues(params.vehicle)) {
    return 'scheduler.intake.errors.vehicleRequiredFields';
  }

  if (params.shouldShowVehicleCreate && !hasValidVehicleNumericValues(params.vehicle)) {
    return 'scheduler.intake.errors.vehicleNumberInvalid';
  }

  return null;
}

/**
 * Enriches the base intake payload with lookup-dependent customer/vehicle data.
 */
export function enrichPayloadByLookupState(params: {
  basePayload: SchedulerCreateIntakeRequest;
  lookupState: LookupState;
  vehicleMode: VehicleMode;
  existingVehicleId: string;
  vehicle: VehicleFormState;
  customerFirstName: string;
  customerMiddleName: string;
  customerLastName: string;
  customerPhone: string;
}): string | null {
  if (params.lookupState === 'found') {
    if (params.vehicleMode === 'existing') {
      if (!params.existingVehicleId) {
        return 'scheduler.intake.errors.vehicleSelectionRequired';
      }

      params.basePayload.vehicleId = Number(params.existingVehicleId);
      return null;
    }

    params.basePayload.vehicle = buildVehiclePayload(params.vehicle);
    return null;
  }

  if (params.lookupState === 'not-found') {
    const firstName = params.customerFirstName.trim();
    const lastName = params.customerLastName.trim();
    const hasAnyName = firstName.length > 0 || lastName.length > 0;

    // For mechanic-email intake, backend can resolve/create the linked customer without manual names.
    if (hasAnyName && (!firstName || !lastName)) {
      return 'scheduler.intake.errors.customerNameRequired';
    }

    if (hasAnyName) {
      params.basePayload.customerFirstName = firstName;
      params.basePayload.customerMiddleName = params.customerMiddleName.trim() || undefined;
      params.basePayload.customerLastName = lastName;
      params.basePayload.customerPhoneNumber = params.customerPhone.trim() || undefined;
    }

    params.basePayload.vehicle = buildVehiclePayload(params.vehicle);
  }

  return null;
}
