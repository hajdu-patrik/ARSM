/** Settings error mapping: turns rejected profile, password and delete requests into field errors and message keys. */

import { isAxiosError } from 'axios';
import type { FieldErrors } from './types';
import {
  getFirstFieldErrorMessage,
  hasServerFieldErrors,
  mapSettingsValidationMessageToKey,
  normalizeServerFieldErrors,
} from '../../utils/serverValidation';
import { extractFieldErrors } from './helpers';

/** Message key of a wrong current password, which belongs to the current-password field. */
export const CURRENT_PASSWORD_INVALID_KEY = 'settings.errors.currentPasswordInvalid';

/** Maps a server message to its message key, or to the fallback key when no mapping exists. */
function mapSettingsMessageToToastKey(message: string, fallbackKey: string): string {
  const mappedMessage = mapSettingsValidationMessageToKey(message);
  return mappedMessage === message ? fallbackKey : mappedMessage;
}

/** Error body of a rejected settings request: a field-error dictionary and/or a single detail message. */
interface ServerErrorBody {
  errors?: FieldErrors;
  detail?: string;
}

/** Extracts and localizes field errors from a profile-save response. */
export function extractProfileSaveErrors(err: unknown): FieldErrors | null {
  if (!isAxiosError<ServerErrorBody>(err)) {
    return null;
  }

  const data = err.response?.data;
  const normalizedFieldErrors = normalizeServerFieldErrors(
    extractFieldErrors(data),
    (message) => mapSettingsMessageToToastKey(message, 'toast.profileUpdateFailed'),
  );

  if (hasServerFieldErrors(normalizedFieldErrors)) {
    return normalizedFieldErrors;
  }

  if (data?.detail) {
    return {
      Detail: [mapSettingsMessageToToastKey(data.detail, 'toast.profileUpdateFailed')],
    };
  }

  return null;
}

/** Normalizes password-related server field errors, routing unknown keys to NewPassword. */
export function mapPasswordErrors(errors: FieldErrors): FieldErrors {
  const mapped: FieldErrors = {};

  Object.entries(errors).forEach(([key, value]) => {
    const normalizedValues = value.map((message) => mapSettingsMessageToToastKey(message, 'toast.passwordChangeFailed'));

    if (key === 'CurrentPassword' || key === 'PasswordMismatch') {
      mapped.CurrentPassword = [...(mapped.CurrentPassword ?? []), ...normalizedValues];
    } else if (key === 'ConfirmNewPassword') {
      mapped.ConfirmNewPassword = [...(mapped.ConfirmNewPassword ?? []), ...normalizedValues];
    } else {
      mapped.NewPassword = [...(mapped.NewPassword ?? []), ...normalizedValues];
    }
  });

  return mapped;
}

/** Maps a password-change error to normalized field errors for 422/400 responses, else null. */
export function extractPasswordChangeErrors(err: unknown): FieldErrors | null {
  if (!isAxiosError<ServerErrorBody>(err)) {
    return null;
  }

  const data = err.response?.data;
  const mappedFieldErrors = mapPasswordErrors(extractFieldErrors(data));

  if (hasServerFieldErrors(mappedFieldErrors)) {
    return mappedFieldErrors;
  }

  if (data?.detail) {
    return {
      Detail: [mapSettingsMessageToToastKey(data.detail, 'toast.passwordChangeFailed')],
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
    extractFieldErrors(data),
    (message) => mapSettingsMessageToToastKey(message, 'toast.profileDeleteFailed'),
  );

  if (hasServerFieldErrors(mappedFieldErrors)) {
    return getFirstFieldErrorMessage(mappedFieldErrors) ?? 'toast.profileDeleteFailed';
  }

  if (data?.detail) {
    return mapSettingsMessageToToastKey(data.detail, 'toast.profileDeleteFailed');
  }

  return null;
}
