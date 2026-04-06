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

export interface OptionItem {
  value: string;
  labelKey: string;
}

export type FieldErrors = Record<string, string[]>;

export type GetFieldError = (field: string) => string | undefined;
