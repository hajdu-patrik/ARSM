/** Shared settings page type aliases. */

/** Map of backend field names to validation error message lists. */
export type FieldErrors = Record<string, string[]>;

/** Function signature for retrieving the first message for a field. */
export type GetFieldError = (field: string) => string | undefined;
