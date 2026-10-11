/** Pure helpers of the scheduler intake form: defaults, vehicle input rules, validation and request building. */
import { isAxiosError } from 'axios';
import { isRecord } from '../../../../services/http/record-guard';
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

/** Narrows an error response body to the intake problem-details shape. */
function isIntakeApiError(value: unknown): value is IntakeApiError {
  if (!isRecord(value)) {
    return false;
  }

  return value.detail === undefined || typeof value.detail === 'string';
}

/** Lower-case backend detail fragments and their i18n keys; the first match wins, so order matters. */
const INTAKE_ERROR_TERM_MAP: ReadonlyArray<{ readonly term: string; readonly key: string }> = [
  { term: 'invalid email', key: 'common.validation.invalidEmail' },
  { term: 'taskdescription is required', key: 'scheduler.intake.errors.taskRequired' },
  { term: 'duedatetime must be greater than or equal to scheduleddate', key: 'scheduler.intake.errors.dueBeforeScheduled' },
  { term: 'customerfirstname and customerlastname are required', key: 'scheduler.intake.errors.customerNameRequired' },
  { term: 'phone number must be a valid european number', key: 'common.validation.invalidPhone' },
  { term: 'vehicle with this license plate already exists', key: 'scheduler.intake.errors.licensePlateExists' },
  { term: 'vehicle with this vin already exists', key: 'common.validation.vehicleVinInvalid' },
  { term: 'vin', key: 'common.validation.vehicleVinInvalid' },
  { term: 'drivetrain', key: 'common.validation.vehicleDrivetrainInvalid' },
  { term: 'license plate', key: 'common.validation.licensePlateInvalid' },
  { term: 'vehicle.year must be between 1886 and 2100', key: 'common.validation.vehicleYearInvalid' },
  { term: 'must be non-negative', key: 'scheduler.intake.errors.vehicleNumberInvalid' },
  { term: 'scheduleddate cannot be in the past', key: 'scheduler.intake.errors.scheduledInPast' },
  { term: 'already exists', key: 'scheduler.intake.errors.conflictData' },
  { term: 'unable to create intake', key: 'scheduler.intake.errors.conflictData' },
];

/** Lower-case problem detail of a failed intake request, or an empty string. */
function getIntakeErrorDetail(error: unknown): string {
  if (!isAxiosError<unknown>(error)) {
    return '';
  }

  const data = error.response?.data;

  return isIntakeApiError(data) ? (data.detail?.toLowerCase() ?? '') : '';
}

function matchesAnyDetailTerm(detail: string, terms: readonly string[]): boolean {
  return terms.some((term) => detail.includes(term));
}

/** The selected day at the current local time, as a datetime-local value. */
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

/** Default due moment: 17:00 three days after the selected day, as a datetime-local value. */
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

/** Maps a known backend intake error to a localized i18n key; the duplicate-plate check runs before the generic plate pattern so it wins when both would match. */
export function mapIntakeErrorToKey(error: unknown): string {
  const detail = getIntakeErrorDetail(error);

  for (const { term, key } of INTAKE_ERROR_TERM_MAP) {
    if (detail.includes(term)) {
      return key;
    }
  }

  if (matchesAnyDetailTerm(detail, ['invalid first name', 'invalid last name', 'invalid middle name'])) {
    return 'common.validation.invalidName';
  }

  if (detail.includes('vehicle.') && detail.includes('required')) {
    return 'scheduler.intake.errors.vehicleRequiredFields';
  }

  return 'scheduler.intake.errors.createFailed';
}

export function toIso(value: string): string {
  return new Date(value).toISOString();
}

/** Converts the vehicle form into the new-vehicle request, trimming text and parsing numbers. */
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

/** Clamps a typed number into [min, max]; an empty or non-numeric input becomes empty. */
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

/** True when mileage and engine power are numbers within their limits. */
export function hasValidVehicleNumericValues(vehicle: VehicleFormState): boolean {
  const mileageKm = Number(vehicle.mileageKm);
  const enginePowerKw = Number(vehicle.enginePowerKw);

  return !(
    Number.isNaN(mileageKm) || mileageKm < VEHICLE_NUMERIC_LIMITS.mileageKm.min || mileageKm > VEHICLE_NUMERIC_LIMITS.mileageKm.max ||
    Number.isNaN(enginePowerKw) || enginePowerKw < VEHICLE_NUMERIC_LIMITS.enginePowerKw.min || enginePowerKw > VEHICLE_NUMERIC_LIMITS.enginePowerKw.max
  );
}

/** True when every required vehicle text field is filled and the drivetrain is a known type. */
export function hasRequiredVehicleTextValues(vehicle: VehicleFormState): boolean {
  return vehicle.licensePlate.trim().length > 0
    && vehicle.vin.trim().length > 0
    && vehicle.brand.trim().length > 0
    && vehicle.model.trim().length > 0
    && DRIVETRAIN_TYPES.some((drivetrainType) => drivetrainType === vehicle.drivetrainType);
}

/** Validates intake form state before constructing the API request payload. */
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

/** Enriches the base intake payload with lookup-dependent customer/vehicle data. */
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

/** Vehicle form fields that hold a number and are clamped into a range while typing. */
export type RangedVehicleField = keyof typeof VEHICLE_NUMERIC_LIMITS;

/** Narrows a vehicle form field to the numeric ones that have a range in {@link VEHICLE_NUMERIC_LIMITS}. */
export function isRangedVehicleField(field: keyof VehicleFormState): field is RangedVehicleField {
  return field in VEHICLE_NUMERIC_LIMITS;
}

/** Form state the intake request is built from. */
export interface IntakeFormSnapshot {
  readonly lookupState: LookupState;
  readonly normalizedEmail: string;
  readonly dueDateTime: string;
  readonly selectedDate: Date;
  readonly taskDescription: string;
  readonly shouldShowVehicleCreate: boolean;
  readonly vehicleMode: VehicleMode;
  readonly existingVehicleId: string;
  readonly vehicle: VehicleFormState;
  readonly customerFirstName: string;
  readonly customerMiddleName: string;
  readonly customerLastName: string;
  readonly customerPhone: string;
}

/** Validates the form and builds the intake request, or names the i18n key of the first problem. */
export function buildIntakeRequest(form: IntakeFormSnapshot): { request: SchedulerCreateIntakeRequest } | { errorKey: string } {
  const autoScheduledDate = getDefaultScheduledDate(form.selectedDate);
  const validationError = getCreateValidationError({
    lookupState: form.lookupState,
    normalizedEmail: form.normalizedEmail,
    dueDateTime: form.dueDateTime,
    selectedDate: form.selectedDate,
    autoScheduledDate,
    taskDescription: form.taskDescription,
    shouldShowVehicleCreate: form.shouldShowVehicleCreate,
    vehicle: form.vehicle,
  });
  if (validationError) {
    return { errorKey: validationError };
  }

  const request: SchedulerCreateIntakeRequest = {
    customerEmail: form.normalizedEmail,
    scheduledDate: toIso(autoScheduledDate),
    dueDateTime: toIso(form.dueDateTime),
    taskDescription: form.taskDescription.trim(),
  };
  const payloadError = enrichPayloadByLookupState({
    basePayload: request,
    lookupState: form.lookupState,
    vehicleMode: form.vehicleMode,
    existingVehicleId: form.existingVehicleId,
    vehicle: form.vehicle,
    customerFirstName: form.customerFirstName,
    customerMiddleName: form.customerMiddleName,
    customerLastName: form.customerLastName,
    customerPhone: form.customerPhone,
  });

  return payloadError ? { errorKey: payloadError } : { request };
}
