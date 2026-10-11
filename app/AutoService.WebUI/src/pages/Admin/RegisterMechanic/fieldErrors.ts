/** Per-field server validation messages of the mechanic registration form. */

import { getServerFieldError, type ServerFieldErrors } from '../../../utils/serverValidation';
import type { RegisterFieldErrors, RegisterFieldName } from './types';

/** Prefix of the shared validation messages, which describe one field; any other key is a generic failure. */
const FIELD_MESSAGE_KEY_PREFIX = 'common.validation.';

export const NO_REGISTER_FIELD_ERRORS: RegisterFieldErrors = {
  firstName: undefined,
  middleName: undefined,
  lastName: undefined,
  email: undefined,
  password: undefined,
  confirmPassword: undefined,
  phoneNumber: undefined,
  specialization: undefined,
  expertise: undefined,
};

/** Conflicts arrive as a message without a field name but concern exactly one field. */
const MESSAGE_FIELDS: Readonly<Record<string, RegisterFieldName>> = {
  'common.validation.emailExists': 'email',
  'common.validation.phoneExists': 'phoneNumber',
};

/** The first shared validation message of a field in the server's field-error dictionary, if it has one. */
function getFieldMessage(errors: ServerFieldErrors, field: RegisterFieldName): string | undefined {
  const messageKey = getServerFieldError(errors, field);
  if (messageKey === undefined || !messageKey.startsWith(FIELD_MESSAGE_KEY_PREFIX)) {
    return undefined;
  }

  return messageKey;
}

/** Splits the normalized field-error dictionary of a rejected registration by form field. */
export function pickRegisterFieldErrors(errors: ServerFieldErrors): RegisterFieldErrors {
  return {
    firstName: getFieldMessage(errors, 'firstName'),
    middleName: getFieldMessage(errors, 'middleName'),
    lastName: getFieldMessage(errors, 'lastName'),
    email: getFieldMessage(errors, 'email'),
    password: getFieldMessage(errors, 'password'),
    confirmPassword: getFieldMessage(errors, 'confirmPassword'),
    phoneNumber: getFieldMessage(errors, 'phoneNumber'),
    specialization: getFieldMessage(errors, 'specialization'),
    expertise: getFieldMessage(errors, 'expertise'),
  };
}

/** Pins a message that names no field to the one field it concerns, when it is a known conflict. */
export function pickConflictFieldError(messageKey: string): RegisterFieldErrors {
  const field = MESSAGE_FIELDS[messageKey];
  return field === undefined ? NO_REGISTER_FIELD_ERRORS : { ...NO_REGISTER_FIELD_ERRORS, [field]: messageKey };
}
