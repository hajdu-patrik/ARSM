import type { FieldErrors } from './types';
import { extractServerFieldErrors, getServerFieldError } from '../../utils/serverValidation';

export function getFieldError(errors: FieldErrors, field: string): string | undefined {
  return getServerFieldError(errors, field);
}

export function extractFieldErrors(
  data: { errors?: FieldErrors; detail?: string } | undefined,
): FieldErrors {
  return extractServerFieldErrors(data);
}
