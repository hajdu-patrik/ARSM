import {
  parseVehicleNumericValues,
  isDrivetrainType,
  type VehicleFormState,
} from '../helpers';
import type { CreateVehicleRequest, UpdateVehicleRequest } from '../../../types/customers/customers.types';

/**
 * Builds a validated vehicle payload from modal form state.
 * @param form Vehicle form state with string-based numeric inputs.
 * @returns Payload and optional field error key when numeric parsing fails.
 */
export function buildVehiclePayload(form: VehicleFormState): {
  payload: CreateVehicleRequest | UpdateVehicleRequest;
  fieldError: string | null;
} {
  const numericValues = parseVehicleNumericValues(form);

  if (Number.isNaN(numericValues.year)) {
    return { payload: null as never, fieldError: 'customers.errors.vehicleYearInvalid' };
  }

  if (Number.isNaN(numericValues.mileageKm)) {
    return { payload: null as never, fieldError: 'customers.errors.vehicleNumberInvalid' };
  }

  if (Number.isNaN(numericValues.enginePowerKw)) {
    return { payload: null as never, fieldError: 'customers.errors.vehicleNumberInvalid' };
  }

  if (!isDrivetrainType(form.drivetrainType)) {
    return { payload: null as never, fieldError: 'customers.errors.vehicleDrivetrainInvalid' };
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
