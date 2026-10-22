import {
  parseVehicleNumericValues,
  isDrivetrainType,
  type VehicleFormState,
} from '../helpers';
import type { CreateVehicleRequest, VehicleDetailDto } from '../../../types/customers/customers.types';

/** Outcome of building a vehicle payload: the payload, or the i18n key of the first invalid field. */
export type VehiclePayloadResult =
  | { readonly payload: CreateVehicleRequest; readonly fieldError: null }
  | { readonly payload: null; readonly fieldError: string };

/** Builds a validated vehicle payload from modal form state, or a field error if numeric parsing fails. */
export function buildVehiclePayload(form: VehicleFormState): VehiclePayloadResult {
  const numericValues = parseVehicleNumericValues(form);

  if (Number.isNaN(numericValues.year)) {
    return { payload: null, fieldError: 'common.validation.vehicleYearInvalid' };
  }

  if (Number.isNaN(numericValues.mileageKm)) {
    return { payload: null, fieldError: 'customers.errors.vehicleNumberInvalid' };
  }

  if (Number.isNaN(numericValues.enginePowerKw)) {
    return { payload: null, fieldError: 'customers.errors.vehicleNumberInvalid' };
  }

  if (!isDrivetrainType(form.drivetrainType)) {
    return { payload: null, fieldError: 'common.validation.vehicleDrivetrainInvalid' };
  }

  return {
    payload: {
      licensePlate: form.licensePlate.trim(),
      vin: form.vin.trim(),
      brand: form.brand.trim(),
      model: form.model.trim(),
      year: numericValues.year,
      mileageKm: numericValues.mileageKm,
      enginePowerKw: numericValues.enginePowerKw,
      drivetrainType: form.drivetrainType,
    },
    fieldError: null,
  };
}

export function hasRequiredVehicleFields(form: VehicleFormState): boolean {
  return form.licensePlate.trim().length > 0
    && form.vin.trim().length > 0
    && form.brand.trim().length > 0
    && form.model.trim().length > 0
    && form.year.trim().length > 0
    && form.mileageKm.trim().length > 0
    && form.enginePowerKw.trim().length > 0
    && form.drivetrainType.trim().length > 0;
}

export function hasAnyVehicleFieldValue(form: VehicleFormState): boolean {
  return form.licensePlate.trim().length > 0
    || form.vin.trim().length > 0
    || form.brand.trim().length > 0
    || form.model.trim().length > 0
    || form.year.trim().length > 0
    || form.mileageKm.trim().length > 0
    || form.enginePowerKw.trim().length > 0
    || form.drivetrainType.trim().length > 0;
}

/** True when the payload differs from the vehicle snapshot the edit started from. */
export function hasVehicleUpdateChanges(snapshot: VehicleDetailDto, payload: CreateVehicleRequest): boolean {
  return snapshot.licensePlate.trim().toUpperCase() !== payload.licensePlate.trim().toUpperCase()
    || snapshot.vin.trim().toUpperCase() !== payload.vin.trim().toUpperCase()
    || snapshot.brand !== payload.brand
    || snapshot.model !== payload.model
    || snapshot.year !== payload.year
    || snapshot.mileageKm !== payload.mileageKm
    || snapshot.enginePowerKw !== payload.enginePowerKw
    || snapshot.drivetrainType !== payload.drivetrainType;
}
