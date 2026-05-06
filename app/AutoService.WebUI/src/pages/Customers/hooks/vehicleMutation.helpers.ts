import { isAxiosError } from 'axios';
import {
  extractServerFieldErrors,
  normalizeServerFieldErrors,
  type ServerFieldErrors,
} from '../../../utils/serverValidation';
import {
  hasServerFieldErrors,
  mapVehicleValidationMessageToKey,
  parseVehicleNumericValues,
  type VehicleFormState,
} from '../helpers';
import type { CreateVehicleRequest, UpdateVehicleRequest } from '../../../types/customers/customers.types';

export function showVehicleMutationError(
  error: unknown,
  showErrorToast: (message: string) => void,
  getFirstFieldErrorMessage: (errors: ServerFieldErrors) => string | null,
) {
  if (isAxiosError<{ detail?: string; errors?: ServerFieldErrors }>(error)) {
    const responseData = error.response?.data;
    const mappedFieldErrors = normalizeServerFieldErrors(
      extractServerFieldErrors(responseData),
      mapVehicleValidationMessageToKey,
    );

    if (hasServerFieldErrors(mappedFieldErrors)) {
      showErrorToast(getFirstFieldErrorMessage(mappedFieldErrors) ?? 'customers.errors.vehicleSaveFailed');
      return;
    }

    const detailKey = responseData?.detail
      ? mapVehicleValidationMessageToKey(responseData.detail)
      : 'customers.errors.vehicleSaveFailed';
    showErrorToast(detailKey);
    return;
  }

  showErrorToast('customers.errors.vehicleSaveFailed');
}

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

  if (Number.isNaN(numericValues.enginePowerHp)) {
    return { payload: null as never, fieldError: 'customers.errors.vehicleNumberInvalid' };
  }

  if (Number.isNaN(numericValues.engineTorqueNm)) {
    return { payload: null as never, fieldError: 'customers.errors.vehicleNumberInvalid' };
  }

  return {
    payload: {
      licensePlate: form.licensePlate.trim(),
      brand: form.brand.trim(),
      model: form.model.trim(),
      year: numericValues.year,
      mileageKm: numericValues.mileageKm,
      enginePowerHp: numericValues.enginePowerHp,
      engineTorqueNm: numericValues.engineTorqueNm,
    },
    fieldError: null,
  };
}
