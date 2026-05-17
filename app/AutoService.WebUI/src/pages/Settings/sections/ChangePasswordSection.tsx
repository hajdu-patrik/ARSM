/**
 * Settings change-password form section.
 *
 * Provides current/new/confirm password inputs with visibility toggles
 * and inline validation message rendering.
 * @module pages/Settings/sections/ChangePasswordSection
 */

import { memo, useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import { buttonClass, cardClass, inputClass, inputGroupContainerClass, labelClass, passwordToggleButtonClass, sectionTitleClass } from '../constants';

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

interface AutofillResetCallbacks {
  readonly onCurrentPasswordChange: (value: string) => void;
  readonly onNewPasswordChange: (value: string) => void;
  readonly onConfirmNewPasswordChange: (value: string) => void;
}

/** Resolves disabled-submit reason key for the password form. */
function getCredentialsDisabledReasonKey({
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

function useLockFieldWhenEmpty(value: string, setLocked: Dispatch<SetStateAction<boolean>>): void {
  useEffect(() => {
    if (value.length === 0) {
      setLocked(true);
    }
  }, [setLocked, value]);
}

function useClearAutofilledCredentials({
  onCurrentPasswordChange,
  onNewPasswordChange,
  onConfirmNewPasswordChange,
}: AutofillResetCallbacks): void {
  useEffect(() => {
    const clearAutofilledPasswordField = (inputId: string, onChange: (value: string) => void) => {
      const input = document.getElementById(inputId);
      if (!(input instanceof HTMLInputElement)) {
        return;
      }

      if (input.value.length > 0) {
        input.value = '';
        onChange('');
      }
    };

    const frameId = globalThis.requestAnimationFrame(() => {
      clearAutofilledPasswordField('settings-currentPassword', onCurrentPasswordChange);
      clearAutofilledPasswordField('settings-newPassword', onNewPasswordChange);
      clearAutofilledPasswordField('settings-confirmPassword', onConfirmNewPasswordChange);
    });

    return () => {
      globalThis.cancelAnimationFrame(frameId);
    };
  }, [onConfirmNewPasswordChange, onCurrentPasswordChange, onNewPasswordChange]);
}

interface PasswordInputWithToggleProps {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly placeholder: string;
  readonly isVisible: boolean;
  readonly isSubmitting: boolean;
  readonly isLocked: boolean;
  readonly onChange: (value: string) => void;
  readonly onFocus: () => void;
  readonly onToggleVisibility: () => void;
  readonly inputName: string;
  readonly toggleAriaLabel: string;
  readonly hintText?: string;
}

function PasswordInputWithToggle({
  id,
  label,
  value,
  placeholder,
  isVisible,
  isSubmitting,
  isLocked,
  onChange,
  onFocus,
  onToggleVisibility,
  inputName,
  toggleAriaLabel,
  hintText,
}: PasswordInputWithToggleProps) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <div className={inputGroupContainerClass}>
        <input
          id={id}
          type={isVisible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={onFocus}
          placeholder={placeholder}
          className={`${inputClass} pr-12`}
          disabled={isSubmitting}
          autoComplete="off"
          readOnly={isLocked}
          name={inputName}
          data-lpignore="true"
          data-1p-ignore="true"
          data-bwignore="true"
          spellCheck={false}
        />
        <button
          type="button"
          onClick={onToggleVisibility}
          className={`${passwordToggleButtonClass} min-h-11 min-w-11`}
          aria-label={toggleAriaLabel}
        >
          {isVisible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>
      {hintText ? <p className="mt-1 text-xs text-arsm-muted dark:text-arsm-muted-dark">{hintText}</p> : null}
    </div>
  );
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
          <p id={credentialsSubmitDisabledHintId} className="text-xs text-arsm-muted dark:text-arsm-muted-dark">
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
