/**
 * Typed form model and field-error helpers for the mechanic registration page.
 * @module pages/Admin/RegisterMechanic/types
 */

/**
 * Client-side form values for the mechanic registration form.
 */
export interface RegisterMechanicFormValues {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  password: string;
  phoneNumber: string;
  specialization: string;
  expertise: string[];
}

/**
 * A selectable option for dropdowns and chip selectors.
 */
export interface OptionItem {
  value: string;
  labelKey: string;
}

/** Dictionary of field names to their server validation error messages. */
export type FieldErrors = Record<string, string[]>;

/** Lookup function that returns the first validation error for a field. */
export type GetFieldError = (field: string) => string | undefined;
