/**
 * Payload builders for the part/labor-type create/edit forms.
 * @module pages/Inventory/hooks/catalogMutation.helpers
 */
import type { CreateLaborTypeRequest, CreatePartRequest } from '../../../types/catalog/catalog.types';
import type { LaborTypeFormState, PartFormState } from '../helpers';

/**
 * Builds a validated part payload from modal form state.
 * @param form Part form state with a string-based net price input.
 * @returns Payload and optional field error key when numeric parsing fails.
 */
export function buildPartRequest(form: PartFormState): {
  payload: CreatePartRequest;
  fieldError: string | null;
} {
  const netUnitPrice = Number(form.netUnitPrice);

  if (Number.isNaN(netUnitPrice)) {
    return { payload: null as never, fieldError: 'inventory.errors.invalidMoney' };
  }

  return {
    payload: {
      partNumber: form.partNumber.trim(),
      name: form.name.trim(),
      netUnitPrice,
      vatRatePercent: form.vatRatePercent,
    },
    fieldError: null,
  };
}

/**
 * Builds a validated labor type payload from modal form state.
 * @param form Labor type form state with a string-based net rate input.
 * @returns Payload and optional field error key when numeric parsing fails.
 */
export function buildLaborTypeRequest(form: LaborTypeFormState): {
  payload: CreateLaborTypeRequest;
  fieldError: string | null;
} {
  const hourlyNetRate = Number(form.hourlyNetRate);

  if (Number.isNaN(hourlyNetRate)) {
    return { payload: null as never, fieldError: 'inventory.errors.invalidMoney' };
  }

  return {
    payload: {
      code: form.code.trim(),
      name: form.name.trim(),
      hourlyNetRate,
      vatRatePercent: form.vatRatePercent,
    },
    fieldError: null,
  };
}
