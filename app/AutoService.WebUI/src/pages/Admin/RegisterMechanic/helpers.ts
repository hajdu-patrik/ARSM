/** Request-builder and form helper utilities for mechanic registration. */

import type { MechanicListItem, RegisterMechanicRequest } from '../../../services/admin/admin.service';
import { MIN_PASSWORD_LENGTH } from '../../../utils/validation';
import type { RegisterMechanicFormValues } from './types';

/** Builds the full display name of a mechanic roster entry, skipping empty name parts. */
export function buildMechanicDisplayName(mechanic: MechanicListItem): string {
  return [mechanic.firstName, mechanic.middleName, mechanic.lastName]
    .filter(Boolean)
    .join(' ');
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
    values.password.length >= MIN_PASSWORD_LENGTH &&
    values.confirmPassword.length >= MIN_PASSWORD_LENGTH &&
    values.password === values.confirmPassword &&
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
    confirmPassword: '',
    phoneNumber: '',
    specialization: '',
    expertise: [],
  };
}
