/** Policy of the password-change form: its fields, the reason a submit is disabled and the per-field server messages. */

import { CURRENT_PASSWORD_INVALID_KEY, getFieldMessageKey, type ServerFieldErrors } from './serverValidation';

const CREDENTIALS_DISABLED_REASON_KEYS = {
  submitting: 'settings.changingCredentials',
  incomplete: 'settings.fillPasswordFieldsToContinue',
  tooShort: 'common.validation.passwordTooShort',
  mismatch: 'common.validation.passwordMismatch',
} as const;

export type PasswordFieldName = 'currentPassword' | 'newPassword' | 'confirmNewPassword';

/** The server validation message key of every field, undefined while the field has none. */
export type PasswordFieldErrors = Readonly<Record<PasswordFieldName, string | undefined>>;

/** DOM id of every field, which the autofill protection finds the inputs by. */
export const PASSWORD_FIELD_IDS: Readonly<Record<PasswordFieldName, string>> = {
  currentPassword: 'change-password-current',
  newPassword: 'change-password-new',
  confirmNewPassword: 'change-password-confirm',
};

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
export function pickPasswordFieldErrors(errors: ServerFieldErrors): PasswordFieldErrors {
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
