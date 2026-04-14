/**
 * Request-builder and form helper utilities for mechanic registration.
 * @module pages/Admin/RegisterMechanic/helpers
 */

import type { RegisterMechanicRequest } from '../../../services/admin/admin.service';
import type { FieldErrors, RegisterMechanicFormValues } from './types';
import { getServerFieldError } from '../../../utils/serverValidation';

/** Returns the first server validation error for a given field name. */
export function getFieldError(fieldErrors: FieldErrors, field: string): string | undefined {
  return getServerFieldError(fieldErrors, field);
}

/** Converts form values into a trimmed API request payload. */
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

/** Checks whether all required fields are filled and form is not already submitting. */
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

/** Returns a blank form values object for resetting the registration form. */
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
