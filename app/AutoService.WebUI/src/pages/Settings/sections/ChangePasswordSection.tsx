/**
 * Settings change-password form section.
 *
 * Provides current/new/confirm password inputs with visibility toggles
 * and inline validation message rendering.
 * @module pages/Settings/sections/ChangePasswordSection
 */

import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyRound } from 'lucide-react';
import { buttonClass, cardClass, mutedMetaTextClass, sectionTitleClass } from '../constants';
import { getCredentialsDisabledReasonKey } from '../passwordFormPolicy';
import { useClearAutofilledCredentials, useLockFieldWhenEmpty } from '../hooks/usePasswordFieldProtection';
import { PasswordInputWithToggle } from './PasswordInputWithToggle';

/** Props for the ChangePasswordSection component. */
interface ChangePasswordSectionProps {
  readonly currentPassword: string;
  readonly newPassword: string;
  readonly confirmNewPassword: string;
  readonly isSubmitting: boolean;
  readonly onCurrentPasswordChange: (value: string) => void;
  readonly onNewPasswordChange: (value: string) => void;
  readonly onConfirmNewPasswordChange: (value: string) => void;
  readonly onSubmit: (event: React.SyntheticEvent) => void;
}

/**
 * Renders the settings password-change form with accessibility-aware inputs.
 */
const ChangePasswordSectionComponent = memo(function ChangePasswordSection({
  currentPassword,
  newPassword,
  confirmNewPassword,
  isSubmitting,
  onCurrentPasswordChange,
  onNewPasswordChange,
  onConfirmNewPasswordChange,
  onSubmit,
}: ChangePasswordSectionProps) {
  const { t } = useTranslation();
  const credentialsSubmitDisabledHintId = 'settings-credentials-submit-disabled-hint';
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isCurrentFieldLocked, setIsCurrentFieldLocked] = useState(true);
  const [isNewFieldLocked, setIsNewFieldLocked] = useState(true);
  const [isConfirmFieldLocked, setIsConfirmFieldLocked] = useState(true);
  const isPasswordFormIncomplete = !currentPassword || !newPassword || !confirmNewPassword;
  const isPasswordTooShort = newPassword.length > 0 && newPassword.length < 8;
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

  const toggleShowCurrent = useCallback(() => setShowCurrent((isVisible) => !isVisible), []);
  const toggleShowNew = useCallback(() => setShowNew((isVisible) => !isVisible), []);
  const toggleShowConfirm = useCallback(() => setShowConfirm((isVisible) => !isVisible), []);
  const unlockCurrentField = useCallback(() => setIsCurrentFieldLocked(false), []);
  const unlockNewField = useCallback(() => setIsNewFieldLocked(false), []);
  const unlockConfirmField = useCallback(() => setIsConfirmFieldLocked(false), []);

  useLockFieldWhenEmpty(currentPassword, setIsCurrentFieldLocked);
  useLockFieldWhenEmpty(newPassword, setIsNewFieldLocked);
  useLockFieldWhenEmpty(confirmNewPassword, setIsConfirmFieldLocked);

  useClearAutofilledCredentials({
    onCurrentPasswordChange,
    onNewPasswordChange,
    onConfirmNewPasswordChange,
  });

  return (
    <div className={cardClass}>
      <h2 className={sectionTitleClass}>
        {t('settings.changePassword')}
      </h2>

      <form onSubmit={onSubmit} className="space-y-4" noValidate autoComplete="off">
        <input
          type="text"
          name="settings-decoy-username"
          autoComplete="username"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          defaultValue=""
        />

        <input
          type="password"
          name="settings-decoy-password"
          autoComplete="new-password"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          defaultValue=""
        />

        <PasswordInputWithToggle
          id="settings-currentPassword"
          label={t('settings.currentPassword')}
          value={currentPassword}
          placeholder={t('settings.currentPasswordPlaceholder')}
          isVisible={showCurrent}
          isSubmitting={isSubmitting}
          isLocked={isCurrentFieldLocked}
          onChange={onCurrentPasswordChange}
          onFocus={unlockCurrentField}
          onToggleVisibility={toggleShowCurrent}
          inputName="settings-security-current"
          toggleAriaLabel={showCurrent ? t('settings.hidePassword') : t('settings.showPassword')}
        />

        <PasswordInputWithToggle
          id="settings-newPassword"
          label={t('settings.newPassword')}
          value={newPassword}
          placeholder={t('settings.newPasswordPlaceholder')}
          isVisible={showNew}
          isSubmitting={isSubmitting}
          isLocked={isNewFieldLocked}
          onChange={onNewPasswordChange}
          onFocus={unlockNewField}
          onToggleVisibility={toggleShowNew}
          inputName="settings-security-new"
          toggleAriaLabel={showNew ? t('settings.hidePassword') : t('settings.showPassword')}
          hintText={t('settings.passwordHint')}
        />

        <PasswordInputWithToggle
          id="settings-confirmPassword"
          label={t('settings.confirmNewPassword')}
          value={confirmNewPassword}
          placeholder={t('settings.confirmPasswordPlaceholder')}
          isVisible={showConfirm}
          isSubmitting={isSubmitting}
          isLocked={isConfirmFieldLocked}
          onChange={onConfirmNewPasswordChange}
          onFocus={unlockConfirmField}
          onToggleVisibility={toggleShowConfirm}
          inputName="settings-security-confirm"
          toggleAriaLabel={showConfirm ? t('settings.hidePassword') : t('settings.showPassword')}
        />

        <div className="w-full" title={passwordSubmitDisabledTitle}>
          <button
            type="submit"
            disabled={isChangePasswordDisabled}
            className={`w-full ${buttonClass}`}
            aria-busy={isSubmitting}
            aria-describedby={shouldShowPasswordSubmitDisabledHint ? credentialsSubmitDisabledHintId : undefined}
          >
            <KeyRound className="h-4 w-4 shrink-0" />
            <span>{isSubmitting ? t('settings.changingCredentials') : t('settings.changePasswordButton')}</span>
          </button>
        </div>
        {shouldShowPasswordSubmitDisabledHint ? (
          <p id={credentialsSubmitDisabledHintId} className={mutedMetaTextClass}>
            {passwordSubmitDisabledText}
          </p>
        ) : null}
      </form>
    </div>
  );
});

ChangePasswordSectionComponent.displayName = ChangePasswordSectionComponent.name;

/** Password update section rendered on the settings page. */
export const ChangePasswordSection = ChangePasswordSectionComponent;
