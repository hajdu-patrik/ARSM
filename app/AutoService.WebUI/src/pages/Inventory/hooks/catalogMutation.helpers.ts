/** Payload builder for the part/labor-type create/edit form, plus the save-error mapping both kinds share. */
import { isAxiosError } from 'axios';
import { isAllowedVatRate } from '../../../types/catalog/catalog.types';
import {
  extractServerFieldErrors,
  getFirstFieldErrorMessage,
  normalizeServerFieldErrors,
  type ServerFieldErrors,
} from '../../../utils/serverValidation';
import {
  hasServerFieldErrors,
  mapCatalogValidationMessageToKey,
  type CatalogFormState,
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

/** i18n key of the reason a form's VAT rate cannot be saved (a legacy stored 0 is not preselected as valid). */
const INVALID_VAT_RATE_KEY = 'common.validation.invalidVatRate';

/** The validated values of a catalog form; each kind maps them to its own request. */
export interface CatalogItemValues {
  readonly identifier: string;
  readonly name: string;
  readonly rate: number;
  readonly vatRatePercent: number;
}

/** Builds the validated values from modal form state, or a field error if numeric parsing or the VAT rate fails. */
export function buildCatalogValues(form: CatalogFormState): CatalogRequestResult<CatalogItemValues> {
  const rate = Number(form.rate);

  if (Number.isNaN(rate)) {
    return { payload: null, fieldError: 'inventory.errors.invalidMoney' };
  }

  if (!isAllowedVatRate(form.vatRatePercent)) {
    return { payload: null, fieldError: INVALID_VAT_RATE_KEY };
  }

  return {
    payload: { identifier: form.identifier.trim(), name: form.name.trim(), rate, vatRatePercent: form.vatRatePercent },
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
