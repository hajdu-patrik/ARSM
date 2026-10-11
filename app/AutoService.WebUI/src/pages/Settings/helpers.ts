/** Settings page helper functions for server validation integration. */

import type { FieldErrors } from './types';
import { extractServerFieldErrors, getServerFieldError } from '../../utils/serverValidation';

/** Returns the first backend validation message for a given settings field. */
export function getFieldError(errors: FieldErrors, field: string): string | undefined {
  return getServerFieldError(errors, field);
}

/** Extracts server field errors into the settings field error map shape. */
export function extractFieldErrors(
  data: { errors?: FieldErrors; detail?: string } | undefined,
): FieldErrors {
  return extractServerFieldErrors(data);
}

/** Message keys that describe one field; any other key is a generic failure that only the toast shows. */
const FIELD_MESSAGE_KEY_PREFIXES: readonly string[] = ['common.validation.', 'settings.errors.'];

/** Returns the first message key of a field when it describes that field, undefined otherwise. */
export function getFieldMessageKey(errors: FieldErrors, field: string): string | undefined {
  const messageKey = getFieldError(errors, field);
  if (messageKey === undefined) {
    return undefined;
  }

  return FIELD_MESSAGE_KEY_PREFIXES.some((prefix) => messageKey.startsWith(prefix)) ? messageKey : undefined;
}
