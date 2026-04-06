import type { RegisterMechanicRequest } from '../../../services/admin.service';
import type { FieldErrors, RegisterMechanicFormValues } from './types';

function toCapitalized(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function getFieldError(fieldErrors: FieldErrors, field: string): string | undefined {
  const errors = fieldErrors[field] ?? fieldErrors[toCapitalized(field)];
  return errors?.[0];
}

export function buildRegisterMechanicRequest(values: RegisterMechanicFormValues): RegisterMechanicRequest {
  return {
    firstName: values.firstName.trim(),
    middleName: values.middleName.trim() || undefined,
    lastName: values.lastName.trim(),
    email: values.email.trim(),
    password: values.password,
    phoneNumber: values.phoneNumber.trim() || undefined,
    specialization: values.specialization,
    expertise: values.expertise,
  };
}

export function canSubmitForm(values: RegisterMechanicFormValues, isSubmitting: boolean): boolean {
  return (
    values.firstName.trim().length > 0 &&
    values.lastName.trim().length > 0 &&
    values.email.trim().length > 0 &&
    values.password.length >= 8 &&
    values.specialization.length > 0 &&
    values.expertise.length > 0 &&
    !isSubmitting
  );
}

export function emptyRegisterMechanicFormValues(): RegisterMechanicFormValues {
  return {
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    password: '',
    phoneNumber: '',
    specialization: '',
    expertise: [],
  };
}
