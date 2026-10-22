/** Settings page helper functions for server validation integration. */

import type { FieldErrors } from './types';
import { extractServerFieldErrors } from '../../utils/serverValidation';

/** Extracts server field errors into the settings field error map shape. */
export function extractFieldErrors(
  data: { errors?: FieldErrors; detail?: string } | undefined,
): FieldErrors {
  return extractServerFieldErrors(data);
}
