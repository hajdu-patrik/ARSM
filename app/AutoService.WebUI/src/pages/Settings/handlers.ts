/** Settings page handler utilities: password validation, error mapping, and failure handling for page workflows. */

import { isAxiosError } from 'axios';
import type { FieldErrors } from './types';
import {
  getFirstFieldErrorMessage,
  mapSettingsValidationMessageToKey,
  normalizeServerFieldErrors,
} from '../../utils/serverValidation';
import { extractFieldErrors } from './helpers';

const SETTINGS_REQUIRED_FIELD_KEY = 'common.validation.fieldRequired';

function mapSettingsMessageToToastKey(message: string, fallbackKey: string): string {
  const mappedMessage = mapSettingsValidationMessageToKey(message);
  return mappedMessage === message ? fallbackKey : mappedMessage;
}

/** Returns true when the field-error dictionary has at least one non-empty entry. */
export function hasFieldErrors(errors: FieldErrors): boolean {
  return Object.values(errors).some((messages) => messages.length > 0);
}

/** Returns whether a field has a required-field validation error under common server key casing variants. */
export function fieldHasRequiredError(errors: FieldErrors, fieldName: string): boolean {
  const variants = [fieldName, fieldName.toLowerCase(), fieldName.charAt(0).toUpperCase() + fieldName.slice(1)];
  return variants.some((variant) => (errors[variant] ?? []).includes(SETTINGS_REQUIRED_FIELD_KEY));
}

/** Extracts and localizes field errors from a profile-save response. */
export function extractProfileSaveErrors(err: unknown): FieldErrors | null {
  if (!isAxiosError<{ errors?: FieldErrors; detail?: string }>(err)) {
    return null;
  }

  const normalizedFieldErrors = normalizeServerFieldErrors(
    extractFieldErrors(err.response?.data),
    (message) => mapSettingsMessageToToastKey(message, 'toast.profileUpdateFailed'),
  );

  if (hasFieldErrors(normalizedFieldErrors)) {
    return normalizedFieldErrors;
  }

  const detail = err.response?.data?.detail;
  if (detail) {
    return {
      Detail: [mapSettingsMessageToToastKey(detail, 'toast.profileUpdateFailed')],
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
    } else if (key === 'NewPassword') {
      mapped.NewPassword = [...(mapped.NewPassword ?? []), ...normalizedValues];
    } else {
      mapped.NewPassword = [...(mapped.NewPassword ?? []), ...normalizedValues];
    }
  });

  return mapped;
}

/** Maps a password-change error to normalized field errors for 422/400 responses, else null. */
export function extractPasswordChangeErrors(err: unknown): FieldErrors | null {
  if (!isAxiosError<{ errors?: FieldErrors; detail?: string }>(err)) {
    return null;
  }

  const data = err.response?.data;
  const mappedFieldErrors = mapPasswordErrors(extractFieldErrors(data));

  if (hasFieldErrors(mappedFieldErrors)) {
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
  if (!isAxiosError<{ errors?: FieldErrors; detail?: string }>(err)) {
    return null;
  }

  const status = err.response?.status;
  if (status === 403 || status === 401) {
    return 'settings.errors.currentPasswordInvalid';
  }

  const data = err.response?.data;
  const mappedFieldErrors = normalizeServerFieldErrors(
    extractFieldErrors(data),
    (message) => mapSettingsMessageToToastKey(message, 'toast.profileDeleteFailed'),
  );

  if (hasFieldErrors(mappedFieldErrors)) {
    return getFirstFieldErrorMessage(mappedFieldErrors) ?? 'toast.profileDeleteFailed';
  }

  if (data?.detail) {
    return mapSettingsMessageToToastKey(data.detail, 'toast.profileDeleteFailed');
  }

  return null;
}
