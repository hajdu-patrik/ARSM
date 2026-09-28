/** Payload builders for the part/labor-type create/edit forms. */
import type { CreateLaborTypeRequest, CreatePartRequest } from '../../../types/catalog/catalog.types';
import type { LaborTypeFormState, PartFormState } from '../helpers';

/** Builds a validated part payload from modal form state, or a field error if numeric parsing fails. */
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

/** Builds a validated labor type payload from modal form state, or a field error if numeric parsing fails. */
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
