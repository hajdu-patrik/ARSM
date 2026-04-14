/**
 * SchedulerIntakeModal.helpers.ts
 *
 * Auto-generated documentation header for this source file.
 */

import { isAxiosError } from 'axios';
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

/**
 * getDefaultScheduledDate operation.
 *
 * @param Date Parameter.
 * @returns Return value.
 */
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

/**
 * getDefaultDueDate operation.
 *
 * @param Date Parameter.
 * @returns Return value.
 */
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
 * mapIntakeErrorToKey operation.
 *
 * @param unknown Parameter.
 * @returns Return value.
 */
export function mapIntakeErrorToKey(error: unknown): string {
  const detail =
    isAxiosError(error) && isIntakeApiError(error.response?.data)
      ? error.response.data.detail?.toLowerCase() ?? ''
      : '';

  if (detail.includes('invalid email')) return 'scheduler.intake.errors.invalidEmail';
  if (detail.includes('taskdescription is required')) return 'scheduler.intake.errors.taskRequired';
  if (detail.includes('duedatetime must be greater than or equal to scheduleddate')) return 'scheduler.intake.errors.dueBeforeScheduled';
  if (detail.includes('customerfirstname and customerlastname are required')) return 'scheduler.intake.errors.customerNameRequired';
  if (detail.includes('invalid first name') || detail.includes('invalid last name') || detail.includes('invalid middle name')) {
    return 'scheduler.intake.errors.invalidName';
  }
  if (detail.includes('phone number must be a valid hungarian number')) return 'scheduler.intake.errors.invalidPhone';
  if (detail.includes('vehicle.licenseplate, vehicle.brand, and vehicle.model are required')) {
    return 'scheduler.intake.errors.vehicleRequiredFields';
  }
  if (detail.includes('license plate')) return 'scheduler.intake.errors.licensePlateInvalid';
  if (detail.includes('vehicle.year must be between 1886 and 2100')) return 'scheduler.intake.errors.vehicleYearInvalid';
  if (detail.includes('must be non-negative')) return 'scheduler.intake.errors.vehicleNumberInvalid';
  if (detail.includes('scheduleddate cannot be in the past')) return 'scheduler.intake.errors.scheduledInPast';
  if (detail.includes('already exists')) return 'scheduler.intake.errors.conflictData';
  if (detail.includes('unable to create intake')) return 'scheduler.intake.errors.conflictData';

  return 'scheduler.intake.errors.createFailed';
}

/**
 * toIso operation.
 *
 * @param string Parameter.
 * @returns Return value.
 */
export function toIso(value: string): string {
  return new Date(value).toISOString();
}

/**
 * buildVehiclePayload operation.
 *
 * @param VehicleFormState Parameter.
 * @returns Return value.
 */
export function buildVehiclePayload(vehicle: VehicleFormState): SchedulerNewVehicleRequest {
  return {
    licensePlate: vehicle.licensePlate.trim(),
    brand: vehicle.brand.trim(),
    model: vehicle.model.trim(),
    year: Number(vehicle.year),
    mileageKm: Number(vehicle.mileageKm),
    enginePowerHp: Number(vehicle.enginePowerHp),
    engineTorqueNm: Number(vehicle.engineTorqueNm),
  };
}

/**
 * normalizeRangedNumberInput operation.
 *
 * @param string Parameter.
 * @param number Parameter.
 * @param number Parameter.
 * @returns Return value.
 */
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

/**
 * hasValidVehicleNumericValues operation.
 *
 * @param VehicleFormState Parameter.
 * @returns Return value.
 */
export function hasValidVehicleNumericValues(vehicle: VehicleFormState): boolean {
  const mileageKm = Number(vehicle.mileageKm);
  const enginePowerHp = Number(vehicle.enginePowerHp);
  const engineTorqueNm = Number(vehicle.engineTorqueNm);

  return !(
    Number.isNaN(mileageKm) || mileageKm < VEHICLE_NUMERIC_LIMITS.mileageKm.min || mileageKm > VEHICLE_NUMERIC_LIMITS.mileageKm.max ||
    Number.isNaN(enginePowerHp) || enginePowerHp < VEHICLE_NUMERIC_LIMITS.enginePowerHp.min || enginePowerHp > VEHICLE_NUMERIC_LIMITS.enginePowerHp.max ||
    Number.isNaN(engineTorqueNm) || engineTorqueNm < VEHICLE_NUMERIC_LIMITS.engineTorqueNm.min || engineTorqueNm > VEHICLE_NUMERIC_LIMITS.engineTorqueNm.max
  );
}

/**
 * getCreateValidationError operation.
 *
 * @param params Parameter.
 * @returns Return value.
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

  if (params.shouldShowVehicleCreate && !hasValidVehicleNumericValues(params.vehicle)) {
    return 'scheduler.intake.errors.vehicleNumberInvalid';
  }

  return null;
}

/**
 * enrichPayloadByLookupState operation.
 *
 * @param params Parameter.
 * @returns Return value.
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
