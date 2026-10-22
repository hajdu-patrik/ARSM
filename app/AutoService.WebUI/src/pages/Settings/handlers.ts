/** Settings error mapping: turns rejected profile-save and profile-delete requests into field errors and message keys. */

import { isAxiosError } from 'axios';
import {
  CURRENT_PASSWORD_INVALID_KEY,
  extractServerFieldErrors,
  getFirstFieldErrorMessage,
  hasServerFieldErrors,
  mapValidationMessageOrFallback,
  normalizeServerFieldErrors,
  type ServerErrorBody,
  type ServerFieldErrors,
} from '../../utils/serverValidation';

/** Extracts and localizes field errors from a profile-save response. */
export function extractProfileSaveErrors(err: unknown): ServerFieldErrors | null {
  if (!isAxiosError<ServerErrorBody>(err)) {
    return null;
  }

  const data = err.response?.data;
  const normalizedFieldErrors = normalizeServerFieldErrors(
    extractServerFieldErrors(data),
    (message) => mapValidationMessageOrFallback(message, 'settings', 'toast.profileUpdateFailed'),
  );

  if (hasServerFieldErrors(normalizedFieldErrors)) {
    return normalizedFieldErrors;
  }

  if (data?.detail) {
    return {
      Detail: [mapValidationMessageOrFallback(data.detail, 'settings', 'toast.profileUpdateFailed')],
    };
  }

  return null;
}

/** Maps a profile-deletion error to a message key: 403/401 to a password-invalid key, else field/detail mapping, or null. */
export function extractDeleteProfileErrorKey(err: unknown): string | null {
  if (!isAxiosError<ServerErrorBody>(err)) {
    return null;
  }

  const status = err.response?.status;
  if (status === 403 || status === 401) {
    return CURRENT_PASSWORD_INVALID_KEY;
  }

  const data = err.response?.data;
  const mappedFieldErrors = normalizeServerFieldErrors(
    extractServerFieldErrors(data),
    (message) => mapValidationMessageOrFallback(message, 'settings', 'toast.profileDeleteFailed'),
  );

  if (hasServerFieldErrors(mappedFieldErrors)) {
    return getFirstFieldErrorMessage(mappedFieldErrors) ?? 'toast.profileDeleteFailed';
  }

  if (data?.detail) {
    return mapValidationMessageOrFallback(data.detail, 'settings', 'toast.profileDeleteFailed');
  }

  return null;
}
