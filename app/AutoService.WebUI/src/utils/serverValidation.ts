/** Maps backend validation messages to i18n keys, normalizes field-error dictionaries,
 * and extracts errors from Axios payloads for admin/settings (see app/AutoService.WebUI/CLAUDE.md). */

/** Dictionary of field names to their validation error messages. */
export type ServerFieldErrors = Record<string, string[]>;

/** Context discriminator for validation message mapping. */
export type ValidationContext = 'admin' | 'settings';

/** Capitalizes the first character of a string. */
function toCapitalized(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Retrieves the first validation error for a field, trying case variants. */
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

/** Extracts the field errors dictionary from an Axios error response payload. */
export function extractServerFieldErrors(
  data: { errors?: ServerFieldErrors; detail?: string } | undefined,
): ServerFieldErrors {
  return data?.errors ?? {};
}

function containsAny(text: string, fragments: readonly string[]): boolean {
  return fragments.some((fragment) => text.includes(fragment));
}

function containsAll(text: string, fragments: readonly string[]): boolean {
  return fragments.every((fragment) => text.includes(fragment));
}

function mapCommonValidationMessageToKey(normalizedMessage: string): string | null {
  const commonRules: Array<{ readonly suffix: string; readonly isMatch: (message: string) => boolean }> = [
    {
      suffix: 'emailExists',
      isMatch: (message) => containsAll(message, ['email']) && containsAny(message, ['already exists', 'already in use', 'is taken']),
    },
    {
      suffix: 'phoneExists',
      isMatch: (message) => containsAll(message, ['phone']) && containsAny(message, ['already exists', 'already in use', 'is taken']),
    },
    {
      suffix: 'invalidEmail',
      isMatch: (message) => message.includes('email must be a valid email address'),
    },
    {
      suffix: 'invalidPhone',
      isMatch: (message) => message.includes('phone number must be a valid european number'),
    },
    {
      suffix: 'invalidName',
      isMatch: (message) => message.includes('may only contain letters and hyphens'),
    },
    {
      suffix: 'fieldRequired',
      isMatch: (message) => containsAny(message, ['cannot be empty', 'is required', 'must not be blank', 'field is required']),
    },
  ];

  const matchedRule = commonRules.find((rule) => rule.isMatch(normalizedMessage));
  return matchedRule ? `common.validation.${matchedRule.suffix}` : null;
}

function mapPasswordMismatchMessageToKey(normalizedMessage: string): string | null {
  if (!normalizedMessage.includes('passwords do not match')) {
    return null;
  }

  return 'common.validation.passwordMismatch';
}

function mapPasswordValidationMessageToKey(normalizedMessage: string): string | null {
  if (!normalizedMessage.includes('password')) {
    return null;
  }

  const passwordRules: Array<{ readonly suffix: string; readonly isMatch: (message: string) => boolean }> = [
    {
      suffix: 'passwordTooShort',
      isMatch: (message) => message.includes('at least') && (message.includes('character') || message.includes('length')),
    },
    {
      suffix: 'passwordMissingUpper',
      isMatch: (message) => containsAny(message, ['uppercase', 'upper case', 'capital letter']),
    },
    {
      suffix: 'passwordMissingLower',
      isMatch: (message) => containsAny(message, ['lowercase', 'lower case']),
    },
    {
      suffix: 'passwordMissingDigit',
      isMatch: (message) => containsAny(message, ['digit', 'number', 'numeric']),
    },
    {
      suffix: 'passwordMissingSpecial',
      isMatch: (message) => containsAny(message, ['non alphanumeric', 'special character', 'special']),
    },
    {
      suffix: 'passwordTooWeak',
      isMatch: (message) => containsAny(message, ['too weak', 'does not meet', 'does not satisfy']),
    },
  ];

  const matchedRule = passwordRules.find((rule) => rule.isMatch(normalizedMessage));
  return matchedRule ? `common.validation.${matchedRule.suffix}` : null;
}

function mapSettingsSpecificValidationMessageToKey(normalizedMessage: string): string | null {
  if (containsAny(normalizedMessage, ['current password is invalid', 'password is incorrect'])) {
    return 'settings.errors.currentPasswordInvalid';
  }

  return null;
}

/** Maps a backend validation message to its i18n key: uniqueness/format/name/password
 * map to shared `common.validation.*` keys; context only adds settings-specific ones. */
export function mapValidationMessageToKey(message: string, context: ValidationContext): string {
  const normalized = message.trim().toLowerCase();

  const commonMessageKey = mapCommonValidationMessageToKey(normalized);
  if (commonMessageKey) {
    return commonMessageKey;
  }

  const passwordMismatchKey = mapPasswordMismatchMessageToKey(normalized);
  if (passwordMismatchKey) {
    return passwordMismatchKey;
  }

  const passwordMessageKey = mapPasswordValidationMessageToKey(normalized);
  if (passwordMessageKey) {
    return passwordMessageKey;
  }

  if (context === 'settings') {
    const settingsSpecificMessageKey = mapSettingsSpecificValidationMessageToKey(normalized);
    if (settingsSpecificMessageKey) {
      return settingsSpecificMessageKey;
    }
  }

  return message;
}

/** Maps a validation message to an i18n key in the admin context. */
export function mapAdminValidationMessageToKey(message: string): string {
  return mapValidationMessageToKey(message, 'admin');
}

/** Maps a validation message to an i18n key in the settings context. */
export function mapSettingsValidationMessageToKey(message: string): string {
  return mapValidationMessageToKey(message, 'settings');
}

/** Normalizes all error messages in a field errors dictionary by applying a mapping function to each message. */
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

/** Returns the first available message from a field-errors dictionary. */
export function getFirstFieldErrorMessage(errors: ServerFieldErrors): string | null {
  for (const values of Object.values(errors)) {
    if (values.length > 0) {
      return values[0];
    }
  }

  return null;
}
