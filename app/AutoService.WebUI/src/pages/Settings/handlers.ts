/**
 * Settings page handler utilities.
 *
 * Provides password validation, error mapping, and failure-handling helpers
 * for the settings page workflows.
 * @module pages/Settings/handlers
 */

import { isAxiosError } from 'axios';
import type { FieldErrors } from './types';
import { mapSettingsValidationMessageToKey } from '../../utils/serverValidation';
import { extractFieldErrors } from './helpers';

/**
 * Returns true when the field-error dictionary has at least one non-empty entry.
 * @param errors Field errors dictionary.
 * @returns True if any field has validation errors.
 */
export function hasFieldErrors(errors: FieldErrors): boolean {
  return Object.values(errors).some((messages) => messages.length > 0);
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
    const normalizedValues = value.map((message) => mapSettingsValidationMessageToKey(message));

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

  return null;
}

/**
 * Handles API errors from a profile deletion request.
 * Returns the error message key if a 403 or 401 response is detected; returns null otherwise.
 * @param err The error thrown during the profile deletion call.
 * @returns Error message key for auth/permission failures, null otherwise.
 */
export function extractDeleteProfileErrorKey(err: unknown): string | null {
  if (!isAxiosError(err)) {
    return null;
  }

  const status = err.response?.status;
  if (status === 403 || status === 401) {
    return 'settings.currentPasswordIncorrect';
  }

  return null;
}
