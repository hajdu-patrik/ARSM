/**
 * Settings page handler utilities.
 *
 * Provides password validation, error mapping, and failure-handling helpers
 * for the settings page workflows.
 * @module pages/Settings/handlers
 */

import { isAxiosError } from 'axios';
import type { FieldErrors } from './types';
import {
  getFirstFieldErrorMessage,
  mapSettingsValidationMessageToKey,
  normalizeServerFieldErrors,
} from '../../utils/serverValidation';
import { extractFieldErrors } from './helpers';

const SETTINGS_REQUIRED_FIELD_KEY = 'settings.errors.fieldRequired';

function mapSettingsMessageToToastKey(message: string, fallbackKey: string): string {
  const mappedMessage = mapSettingsValidationMessageToKey(message);
  return mappedMessage === message ? fallbackKey : mappedMessage;
}

/**
 * Returns true when the field-error dictionary has at least one non-empty entry.
 * @param errors Field errors dictionary.
 * @returns True if any field has validation errors.
 */
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
    (message) => mapSettingsMessageToToastKey(message, 'settings.updateError'),
  );

  if (hasFieldErrors(normalizedFieldErrors)) {
    return normalizedFieldErrors;
  }

  const detail = err.response?.data?.detail;
  if (detail) {
    return {
      Detail: [mapSettingsMessageToToastKey(detail, 'settings.updateError')],
    };
  }

  return null;
}

/**
 * Normalizes password-related server field errors into a consistent shape.
 * Maps CurrentPassword, ConfirmNewPassword, and NewPassword keys,
 * routing unknown keys to NewPassword.
 * @param errors Raw server field errors from the password change response.
 * @returns Normalized field errors with translated message keys.
 */
export function mapPasswordErrors(errors: FieldErrors): FieldErrors {
  const mapped: FieldErrors = {};

  Object.entries(errors).forEach(([key, value]) => {
    const normalizedValues = value.map((message) => mapSettingsMessageToToastKey(message, 'settings.passwordChangeError'));

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

/**
 * Handles API errors from a password change request.
 * Returns normalized field errors for 422/400 responses; returns null otherwise.
 * @param err The error thrown during the password change call.
 * @returns Normalized field errors if validation failed, null otherwise.
 */
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
      Detail: [mapSettingsMessageToToastKey(data.detail, 'settings.passwordChangeError')],
    };
  }

  return null;
}

/**
 * Handles API errors from a profile deletion request.
 * Returns the error message key if a 403 or 401 response is detected; returns null otherwise.
 * @param err The error thrown during the profile deletion call.
 * @returns Error message key for auth/permission failures, null otherwise.
 */
export function extractDeleteProfileErrorKey(err: unknown): string | null {
  if (!isAxiosError<{ errors?: FieldErrors; detail?: string }>(err)) {
    return null;
  }

  const status = err.response?.status;
  if (status === 403 || status === 401) {
    return 'settings.currentPasswordIncorrect';
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
