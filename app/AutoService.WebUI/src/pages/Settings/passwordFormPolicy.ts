/**
 * Settings password form policy helpers.
 * @module pages/Settings/passwordFormPolicy
 */

const CREDENTIALS_DISABLED_REASON_KEYS = {
  submitting: 'settings.changingCredentials',
  incomplete: 'settings.fillPasswordFieldsToContinue',
  tooShort: 'settings.passwordTooShort',
  mismatch: 'settings.passwordsDoNotMatch',
} as const;

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
