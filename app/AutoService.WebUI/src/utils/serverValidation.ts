/** Maps backend validation messages to i18n keys, normalizes field-error dictionaries,
 * and extracts errors from Axios payloads for admin/settings (see app/AutoService.WebUI/CLAUDE.md). */

/** Dictionary of field names to their validation error messages. */
export type ServerFieldErrors = Record<string, string[]>;

/** Body of a rejected request: a field-error dictionary and/or one detail message. */
export interface ServerErrorBody {
  errors?: ServerFieldErrors;
  detail?: string;
}

/** Context discriminator for validation message mapping. */
export type ValidationContext = 'admin' | 'settings';

/** Message key of a wrong current password, which belongs to the current-password field. */
export const CURRENT_PASSWORD_INVALID_KEY = 'settings.errors.currentPasswordInvalid';

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

/** Prefixes of the message keys that describe one field. */
const FIELD_MESSAGE_KEY_PREFIXES: readonly string[] = ['common.validation.', 'settings.errors.'];

/** True for a message key that describes one field; any other key is a generic failure that only the toast shows. */
export function isFieldMessageKey(messageKey: string): boolean {
  return FIELD_MESSAGE_KEY_PREFIXES.some((prefix) => messageKey.startsWith(prefix));
}

/** Returns the first message key of a field when it describes that field, undefined otherwise. */
export function getFieldMessageKey(errors: ServerFieldErrors, field: string): string | undefined {
  const messageKey = getServerFieldError(errors, field);
  return messageKey !== undefined && isFieldMessageKey(messageKey) ? messageKey : undefined;
}

/** Returns true when the field-error dictionary has at least one non-empty entry. */
export function hasServerFieldErrors(errors: ServerFieldErrors): boolean {
  return Object.values(errors).some((messages) => messages.length > 0);
}

/** True when the server marked the field as required, whichever letter case its dictionary key uses. */
export function hasRequiredFieldError(errors: ServerFieldErrors, field: string): boolean {
  const variants = [field, field.toLowerCase(), toCapitalized(field)];
  return variants.some((variant) => (errors[variant] ?? []).includes('common.validation.fieldRequired'));
}

/** Extracts the field errors dictionary from an Axios error response payload. */
export function extractServerFieldErrors(data: ServerErrorBody | undefined): ServerFieldErrors {
  return data?.errors ?? {};
}

/** True when the text contains at least one of the fragments. */
function containsAny(text: string, fragments: readonly string[]): boolean {
  return fragments.some((fragment) => text.includes(fragment));
}

/** True when the text contains every fragment. */
function containsAll(text: string, fragments: readonly string[]): boolean {
  return fragments.every((fragment) => text.includes(fragment));
}

/** One message-matching rule: a normalized message that matches maps to `common.validation.<suffix>`. */
interface ValidationMessageRule {
  readonly suffix: string;
  readonly isMatch: (message: string) => boolean;
}

/** Returns the `common.validation.*` key of the first matching rule, or null. */
function findValidationRuleKey(rules: readonly ValidationMessageRule[], normalizedMessage: string): string | null {
  const matchedRule = rules.find((rule) => rule.isMatch(normalizedMessage));
  return matchedRule ? `common.validation.${matchedRule.suffix}` : null;
}

/** Uniqueness, format, name and required-field rules shared by every context. */
const COMMON_VALIDATION_RULES: readonly ValidationMessageRule[] = [
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

/** Password-policy rules, checked in order once the message mentions a password. */
const PASSWORD_VALIDATION_RULES: readonly ValidationMessageRule[] = [
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

/** Maps a uniqueness, format, name or required-field message to its shared key. */
function mapCommonValidationMessageToKey(normalizedMessage: string): string | null {
  return findValidationRuleKey(COMMON_VALIDATION_RULES, normalizedMessage);
}

/** Maps the password-confirmation mismatch message to its shared key. */
function mapPasswordMismatchMessageToKey(normalizedMessage: string): string | null {
  if (!normalizedMessage.includes('passwords do not match')) {
    return null;
  }

  return 'common.validation.passwordMismatch';
}

/** Maps a password-policy message to its shared key. */
function mapPasswordValidationMessageToKey(normalizedMessage: string): string | null {
  if (!normalizedMessage.includes('password')) {
    return null;
  }

  return findValidationRuleKey(PASSWORD_VALIDATION_RULES, normalizedMessage);
}

/** Maps a settings-only message (wrong current password) to its settings key. */
function mapSettingsSpecificValidationMessageToKey(normalizedMessage: string): string | null {
  if (containsAny(normalizedMessage, ['current password is invalid', 'password is incorrect'])) {
    return CURRENT_PASSWORD_INVALID_KEY;
  }

  return null;
}

/** Maps a backend validation message to its i18n key: uniqueness/format/name/password
 * map to shared `common.validation.*` keys; context only adds settings-specific ones. */
function mapValidationMessageToKey(message: string, context: ValidationContext): string {
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

/** Maps a validation message to an i18n key in the settings context. */
export function mapSettingsValidationMessageToKey(message: string): string {
  return mapValidationMessageToKey(message, 'settings');
}

/** Maps a validation message to its i18n key in the context, or to `fallbackKey` when no rule matches it. */
export function mapValidationMessageOrFallback(message: string, context: ValidationContext, fallbackKey: string): string {
  const mappedKey = mapValidationMessageToKey(message, context);
  return mappedKey === message ? fallbackKey : mappedKey;
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
  for (const [firstMessage] of Object.values(errors)) {
    if (firstMessage !== undefined) {
      return firstMessage;
    }
  }

  return null;
}
