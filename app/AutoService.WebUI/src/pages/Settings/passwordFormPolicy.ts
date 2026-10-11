/** Settings password form policy helpers. */

import { CURRENT_PASSWORD_INVALID_KEY } from './handlers';
import { getFieldMessageKey } from './helpers';
import type { FieldErrors } from './types';

const CREDENTIALS_DISABLED_REASON_KEYS = {
  submitting: 'settings.changingCredentials',
  incomplete: 'settings.fillPasswordFieldsToContinue',
  tooShort: 'common.validation.passwordTooShort',
  mismatch: 'common.validation.passwordMismatch',
} as const;

/** Fields of the password-change form. */
export type PasswordFieldName = 'currentPassword' | 'newPassword' | 'confirmNewPassword';

/** The server validation message key of every field, undefined while the field has none. */
export type PasswordFieldErrors = Readonly<Record<PasswordFieldName, string | undefined>>;

export const NO_PASSWORD_FIELD_ERRORS: PasswordFieldErrors = {
  currentPassword: undefined,
  newPassword: undefined,
  confirmNewPassword: undefined,
};

/** The field a disabled-submit reason is about, or null when the reason concerns the whole form. */
export function getPasswordFieldOfReason(reasonKey: string | null): PasswordFieldName | null {
  if (reasonKey === CREDENTIALS_DISABLED_REASON_KEYS.tooShort) {
    return 'newPassword';
  }

  return reasonKey === CREDENTIALS_DISABLED_REASON_KEYS.mismatch ? 'confirmNewPassword' : null;
}

/** The message of every field in a rejected password change; a wrong current password may arrive as a plain detail. */
export function pickPasswordFieldErrors(errors: FieldErrors): PasswordFieldErrors {
  const detailMessage = getFieldMessageKey(errors, 'detail');

  return {
    currentPassword: getFieldMessageKey(errors, 'currentPassword')
      ?? (detailMessage === CURRENT_PASSWORD_INVALID_KEY ? detailMessage : undefined),
    newPassword: getFieldMessageKey(errors, 'newPassword'),
    confirmNewPassword: getFieldMessageKey(errors, 'confirmNewPassword'),
  };
}

interface CredentialsDisabledReasonInput {
  readonly isSubmitting: boolean;
  readonly isPasswordFormIncomplete: boolean;
  readonly isPasswordTooShort: boolean;
  readonly isPasswordMismatch: boolean;
}

/** Resolves disabled-submit reason key for the password form. */
export function getCredentialsDisabledReasonKey({
  isSubmitting,
  isPasswordFormIncomplete,
  isPasswordTooShort,
  isPasswordMismatch,
}: CredentialsDisabledReasonInput): string | null {
  if (isSubmitting) {
    return CREDENTIALS_DISABLED_REASON_KEYS.submitting;
  }

  if (isPasswordFormIncomplete) {
    return CREDENTIALS_DISABLED_REASON_KEYS.incomplete;
  }

  if (isPasswordTooShort) {
    return CREDENTIALS_DISABLED_REASON_KEYS.tooShort;
  }

  if (isPasswordMismatch) {
    return CREDENTIALS_DISABLED_REASON_KEYS.mismatch;
  }

  return null;
}
