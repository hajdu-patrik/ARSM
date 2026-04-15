/**
 * Settings page helper functions for server validation integration.
 * @module pages/Settings/helpers
 */

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
