export type FieldErrors = Record<string, string[]>;

export type GetFieldError = (field: string) => string | undefined;
