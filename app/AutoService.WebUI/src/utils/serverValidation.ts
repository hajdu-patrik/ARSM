/**
 * Server-side validation error handling utilities.
 *
 * Maps backend validation error messages to i18n translation keys,
 * normalizes field error dictionaries, and extracts errors from
 * Axios response payloads. Supports both admin and settings contexts.
 * @module utils/serverValidation
 */

/** Dictionary of field names to their validation error messages. */
export type ServerFieldErrors = Record<string, string[]>;

/** Context discriminator for validation message mapping. */
export type ValidationContext = 'admin' | 'settings';

/**
 * Capitalizes the first character of a string.
 * @param value - The string to capitalize.
 * @returns The capitalized string.
 */
function toCapitalized(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Retrieves the first validation error for a field, trying case variants.
 * @param errors - The server field errors dictionary.
 * @param field - The field name to look up.
 * @returns The first error message, or {@code undefined} if none found.
 */
export function getServerFieldError(errors: ServerFieldErrors, field: string): string | undefined {
  const variants = [field, field.toLowerCase(), toCapitalized(field)];

  for (const variant of variants) {
    const values = errors[variant];
    if (values?.length) {
      return values[0];
    }
  }

  return undefined;
}

/**
 * Extracts the field errors dictionary from an Axios error response payload.
 * @param data - The response data containing optional {@code errors} field.
 * @returns The extracted errors, or an empty object if none present.
 */
export function extractServerFieldErrors(
  data: { errors?: ServerFieldErrors; detail?: string } | undefined,
): ServerFieldErrors {
  return data?.errors ?? {};
}

/**
 * Maps a backend validation message string to its corresponding i18n key.
 * Handles email/phone uniqueness, format validation, name validation,
 * and password-related errors based on the operation context.
 * @param message - The raw validation message from the server.
 * @param context - The operation context ({@code 'admin'} or {@code 'settings'}).
 * @returns The mapped i18n key, or the original message if no mapping matches.
 */
export function mapValidationMessageToKey(message: string, context: ValidationContext): string {
  const normalized = message.trim().toLowerCase();

  if (normalized.includes('already exists') && normalized.includes('email')) {
    return `${context}.errors.emailExists`;
  }

  if (normalized.includes('already exists') && normalized.includes('phone')) {
    return `${context}.errors.phoneExists`;
  }

  if (normalized.includes('email must be a valid email address')) {
    return `${context}.errors.invalidEmail`;
  }

  if (normalized.includes('phone number must be a valid european number')) {
    return `${context}.errors.invalidPhone`;
  }

  if (normalized.includes('may only contain letters and hyphens')) {
    return `${context}.errors.invalidName`;
  }

  if (context === 'settings') {
    if (normalized.includes('current password is invalid') || normalized.includes('password is incorrect')) {
      return 'settings.errors.currentPasswordInvalid';
    }

    if (normalized.includes('passwords do not match')) {
      return 'settings.passwordsDoNotMatch';
    }
  }

  return message;
}

/**
 * Maps a validation message to an i18n key in the admin context.
 * @param message - The raw validation message.
 * @returns The mapped i18n key.
 */
export function mapAdminValidationMessageToKey(message: string): string {
  return mapValidationMessageToKey(message, 'admin');
}

/**
 * Maps a validation message to an i18n key in the settings context.
 * @param message - The raw validation message.
 * @returns The mapped i18n key.
 */
export function mapSettingsValidationMessageToKey(message: string): string {
  return mapValidationMessageToKey(message, 'settings');
}

/**
 * Normalizes all error messages in a field errors dictionary by applying
 * a mapping function to each message string.
 * @param errors - The original server field errors.
 * @param mapMessage - Function that maps raw messages to i18n keys.
 * @returns A new errors dictionary with mapped message values.
 */
export function normalizeServerFieldErrors(
  errors: ServerFieldErrors,
  mapMessage: (message: string) => string,
): ServerFieldErrors {
  return Object.fromEntries(
    Object.entries(errors).map(([key, values]) => [
      key,
      values.map((value) => mapMessage(value)),
    ]),
  );
}
