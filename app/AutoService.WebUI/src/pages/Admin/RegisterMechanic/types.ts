/** Form model, field-error and list types of the mechanic registration page. */

export interface RegisterMechanicFormValues {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phoneNumber: string;
  specialization: string;
  expertise: string[];
}

/** Form fields that can carry a validation message. */
export type RegisterFieldName = keyof RegisterMechanicFormValues;

/** Form fields that hold plain text, as opposed to the expertise tags. */
export type RegisterTextFieldName = Exclude<RegisterFieldName, 'expertise'>;

/** The validation message key of every field, undefined while the field has none. */
export type RegisterFieldErrors = Readonly<Record<RegisterFieldName, string | undefined>>;

/** A selectable option for dropdowns and chip selectors. */
export interface OptionItem {
  value: string;
  labelKey: string;
}
