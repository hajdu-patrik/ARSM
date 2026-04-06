import type { FieldErrors } from './types';

export function getFieldError(errors: FieldErrors, field: string): string | undefined {
  const values = errors[field] ?? errors[field.toLowerCase()];
  return values?.[0];
}

export function extractFieldErrors(
  data: { errors?: FieldErrors; detail?: string } | undefined,
): FieldErrors {
  if (!data?.errors) return {};
  return data.errors;
}
