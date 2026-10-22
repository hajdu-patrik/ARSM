/** Change-password form (current, new, confirm) with visibility toggles and inline validation, shared by
 * Settings and the required-change page; the page around it supplies the card and the title. */

import { memo, useCallback, useId, useState, type SyntheticEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyRound } from 'lucide-react';
import { useClearAutofilledCredentials, useLockFieldWhenEmpty } from '../../hooks/usePasswordFieldProtection';
import { fieldErrorA11yProps } from '../../utils/fieldA11y';
import { buttonClass, defaultIconClass, mutedMetaTextClass } from '../../utils/formStyles';
import { MIN_PASSWORD_LENGTH } from '../../utils/validation';
import {
  getCredentialsDisabledReasonKey,
  getPasswordFieldOfReason,
  PASSWORD_FIELD_IDS,
  type PasswordFieldErrors,
  type PasswordFieldName,
} from '../../utils/passwordFormPolicy';
import { PasswordInputWithToggle } from './PasswordInputWithToggle';

export interface ChangePasswordFormProps {
  readonly currentPassword: string;
  readonly newPassword: string;
  readonly confirmNewPassword: string;
  readonly fieldErrors: PasswordFieldErrors;
  readonly isSubmitting: boolean;
  readonly onCurrentPasswordChange: (value: string) => void;
  readonly onNewPasswordChange: (value: string) => void;
  readonly onConfirmNewPasswordChange: (value: string) => void;
  readonly onSubmit: (event: SyntheticEvent) => void;
}

export const ChangePasswordForm = memo(function ChangePasswordForm({
  currentPassword,
  newPassword,
  confirmNewPassword,
  fieldErrors,
  isSubmitting,
  onCurrentPasswordChange,
  onNewPasswordChange,
  onConfirmNewPasswordChange,
  onSubmit,
}: ChangePasswordFormProps) {
  const { t } = useTranslation();
  const idPrefix = useId();
  const credentialsSubmitDisabledHintId = `${idPrefix}-submit-disabled-hint`;
  const errorId = (field: PasswordFieldName) => `${idPrefix}-${field}-error`;
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isCurrentFieldLocked, setIsCurrentFieldLocked] = useState(true);
  const [isNewFieldLocked, setIsNewFieldLocked] = useState(true);
  const [isConfirmFieldLocked, setIsConfirmFieldLocked] = useState(true);
  const isPasswordFormIncomplete = !currentPassword || !newPassword || !confirmNewPassword;
  const isPasswordTooShort = newPassword.length > 0 && newPassword.length < MIN_PASSWORD_LENGTH;
  const isPasswordMismatch = confirmNewPassword.length > 0 && newPassword !== confirmNewPassword;
  const isChangePasswordDisabled = isSubmitting || isPasswordFormIncomplete || isPasswordTooShort || isPasswordMismatch;
  const passwordSubmitDisabledReasonKey = getCredentialsDisabledReasonKey({
    isSubmitting,
    isPasswordFormIncomplete,
    isPasswordTooShort,
    isPasswordMismatch,
  });
  const passwordSubmitDisabledText = passwordSubmitDisabledReasonKey ? t(passwordSubmitDisabledReasonKey) : '';
  const shouldShowPasswordSubmitDisabledHint = isChangePasswordDisabled && Boolean(passwordSubmitDisabledReasonKey);
  const passwordSubmitDisabledTitle = shouldShowPasswordSubmitDisabledHint ? passwordSubmitDisabledText : undefined;
  const hintedField = shouldShowPasswordSubmitDisabledHint
    ? getPasswordFieldOfReason(passwordSubmitDisabledReasonKey)
    : null;

  /** A field points at its own server error text, else at the hint under the button when that hint is about this field. */
  const getFieldA11yProps = (field: PasswordFieldName) => {
    const serverMessageKey = fieldErrors[field];

    if (serverMessageKey !== undefined) {
      return fieldErrorA11yProps(errorId(field), serverMessageKey);
    }

    return fieldErrorA11yProps(
      credentialsSubmitDisabledHintId,
      hintedField === field ? passwordSubmitDisabledText : undefined,
    );
  };

  const toggleShowCurrent = useCallback(() => {
    setShowCurrent((isVisible) => !isVisible);
  }, []);
  const toggleShowNew = useCallback(() => {
    setShowNew((isVisible) => !isVisible);
  }, []);
  const toggleShowConfirm = useCallback(() => {
    setShowConfirm((isVisible) => !isVisible);
  }, []);
  const unlockCurrentField = useCallback(() => {
    setIsCurrentFieldLocked(false);
  }, []);
  const unlockNewField = useCallback(() => {
    setIsNewFieldLocked(false);
  }, []);
  const unlockConfirmField = useCallback(() => {
    setIsConfirmFieldLocked(false);
  }, []);

  useLockFieldWhenEmpty(currentPassword, setIsCurrentFieldLocked);
  useLockFieldWhenEmpty(newPassword, setIsNewFieldLocked);
  useLockFieldWhenEmpty(confirmNewPassword, setIsConfirmFieldLocked);

  useClearAutofilledCredentials({
    onCurrentPasswordChange,
    onNewPasswordChange,
    onConfirmNewPasswordChange,
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate autoComplete="off">
      <input
        type="text"
        name="change-password-decoy-username"
        autoComplete="username"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        defaultValue=""
      />

      <input
        type="password"
        name="change-password-decoy-password"
        autoComplete="new-password"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        defaultValue=""
      />

      <PasswordInputWithToggle
        id={PASSWORD_FIELD_IDS.currentPassword}
        label={t('settings.currentPassword')}
        value={currentPassword}
        placeholder={t('settings.currentPasswordPlaceholder')}
        isVisible={showCurrent}
        isSubmitting={isSubmitting}
        isLocked={isCurrentFieldLocked}
        onChange={onCurrentPasswordChange}
        onFocus={unlockCurrentField}
        onToggleVisibility={toggleShowCurrent}
        inputName="account-security-current"
        toggleAriaLabel={showCurrent ? t('settings.hidePassword') : t('settings.showPassword')}
        a11yProps={getFieldA11yProps('currentPassword')}
        errorId={errorId('currentPassword')}
        errorKey={fieldErrors.currentPassword}
      />

      <PasswordInputWithToggle
        id={PASSWORD_FIELD_IDS.newPassword}
        label={t('settings.newPassword')}
        value={newPassword}
        placeholder={t('settings.newPasswordPlaceholder')}
        isVisible={showNew}
        isSubmitting={isSubmitting}
        isLocked={isNewFieldLocked}
        onChange={onNewPasswordChange}
        onFocus={unlockNewField}
        onToggleVisibility={toggleShowNew}
        inputName="account-security-new"
        toggleAriaLabel={showNew ? t('settings.hidePassword') : t('settings.showPassword')}
        hintText={t('common.validation.passwordHint')}
        a11yProps={getFieldA11yProps('newPassword')}
        errorId={errorId('newPassword')}
        errorKey={fieldErrors.newPassword}
      />

      <PasswordInputWithToggle
        id={PASSWORD_FIELD_IDS.confirmNewPassword}
        label={t('settings.confirmNewPassword')}
        value={confirmNewPassword}
        placeholder={t('settings.confirmPasswordPlaceholder')}
        isVisible={showConfirm}
        isSubmitting={isSubmitting}
        isLocked={isConfirmFieldLocked}
        onChange={onConfirmNewPasswordChange}
        onFocus={unlockConfirmField}
        onToggleVisibility={toggleShowConfirm}
        inputName="account-security-confirm"
        toggleAriaLabel={showConfirm ? t('settings.hidePassword') : t('settings.showPassword')}
        a11yProps={getFieldA11yProps('confirmNewPassword')}
        errorId={errorId('confirmNewPassword')}
        errorKey={fieldErrors.confirmNewPassword}
      />

      <div className="w-full" title={passwordSubmitDisabledTitle}>
        <button
          type="submit"
          disabled={isChangePasswordDisabled}
          className={`w-full ${buttonClass}`}
          aria-busy={isSubmitting}
          aria-describedby={shouldShowPasswordSubmitDisabledHint ? credentialsSubmitDisabledHintId : undefined}
        >
          <KeyRound className={defaultIconClass} />
          <span>{isSubmitting ? t('settings.changingCredentials') : t('settings.changePassword')}</span>
        </button>
      </div>
      {shouldShowPasswordSubmitDisabledHint ? (
        <p id={credentialsSubmitDisabledHintId} className={mutedMetaTextClass}>
          {passwordSubmitDisabledText}
        </p>
      ) : null}
    </form>
  );
});
