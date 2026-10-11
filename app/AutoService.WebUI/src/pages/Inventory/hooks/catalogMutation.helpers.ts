/** Payload builders for the part/labor-type create/edit forms, plus the save-error mapping both forms share. */
import { isAxiosError } from 'axios';
import type { CreateLaborTypeRequest, CreatePartRequest } from '../../../types/catalog/catalog.types';
import {
  extractServerFieldErrors,
  getFirstFieldErrorMessage,
  normalizeServerFieldErrors,
  type ServerFieldErrors,
} from '../../../utils/serverValidation';
import {
  hasServerFieldErrors,
  mapCatalogValidationMessageToKey,
  type LaborTypeFormState,
  type PartFormState,
} from '../helpers';

/** A request built from form state, or the i18n key of the reason it cannot be built. */
export type CatalogRequestResult<TRequest> =
  | { readonly payload: TRequest; readonly fieldError: null }
  | { readonly payload: null; readonly fieldError: string };

/** Problem body a catalog endpoint answers a rejected write with. */
interface CatalogProblemBody {
  detail?: string;
  errors?: ServerFieldErrors;
}

/** Builds a validated part payload from modal form state, or a field error if numeric parsing fails. */
export function buildPartRequest(form: PartFormState): CatalogRequestResult<CreatePartRequest> {
  const netUnitPrice = Number(form.netUnitPrice);

  if (Number.isNaN(netUnitPrice)) {
    return { payload: null, fieldError: 'inventory.errors.invalidMoney' };
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
export function buildLaborTypeRequest(form: LaborTypeFormState): CatalogRequestResult<CreateLaborTypeRequest> {
  const hourlyNetRate = Number(form.hourlyNetRate);

  if (Number.isNaN(hourlyNetRate)) {
    return { payload: null, fieldError: 'inventory.errors.invalidMoney' };
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

/** Maps a rejected part/labor-type write to the i18n key of the message to show, or `fallbackKey` when the server named none. */
export function resolveCatalogSaveErrorKey(error: unknown, fallbackKey: string): string {
  if (!isAxiosError<CatalogProblemBody>(error)) {
    return fallbackKey;
  }

  const responseData = error.response?.data;
  const mappedFieldErrors = normalizeServerFieldErrors(
    extractServerFieldErrors(responseData),
    mapCatalogValidationMessageToKey,
  );

  if (hasServerFieldErrors(mappedFieldErrors)) {
    return getFirstFieldErrorMessage(mappedFieldErrors) ?? fallbackKey;
  }

  return responseData?.detail ? mapCatalogValidationMessageToKey(responseData.detail) : fallbackKey;
}
