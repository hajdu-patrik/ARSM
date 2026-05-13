/**
 * Settings change-password form section.
 *
 * Provides current/new/confirm password inputs with visibility toggles
 * and inline validation message rendering.
 * @module pages/Settings/sections/ChangePasswordSection
 */

import { memo, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff } from 'lucide-react';
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
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isCurrentFieldLocked, setIsCurrentFieldLocked] = useState(true);
  const [isNewFieldLocked, setIsNewFieldLocked] = useState(true);
  const [isConfirmFieldLocked, setIsConfirmFieldLocked] = useState(true);

  const toggleShowCurrent = useCallback(() => setShowCurrent((isVisible) => !isVisible), []);
  const toggleShowNew = useCallback(() => setShowNew((isVisible) => !isVisible), []);
  const toggleShowConfirm = useCallback(() => setShowConfirm((isVisible) => !isVisible), []);

  useEffect(() => {
    if (currentPassword.length === 0) {
      setIsCurrentFieldLocked(true);
    }
  }, [currentPassword]);

  useEffect(() => {
    if (newPassword.length === 0) {
      setIsNewFieldLocked(true);
    }
  }, [newPassword]);

  useEffect(() => {
    if (confirmNewPassword.length === 0) {
      setIsConfirmFieldLocked(true);
    }
  }, [confirmNewPassword]);

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

        <div>
          <label htmlFor="settings-currentPassword" className={labelClass}>
            {t('settings.currentPassword')}
          </label>
          <div className={inputGroupContainerClass}>
            <input
              id="settings-currentPassword"
              type={showCurrent ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => onCurrentPasswordChange(e.target.value)}
              onFocus={() => {
                if (isCurrentFieldLocked) {
                  setIsCurrentFieldLocked(false);
                }
              }}
              placeholder={t('settings.currentPasswordPlaceholder')}
              className={`${inputClass} pr-12`}
              disabled={isSubmitting}
              autoComplete="off"
              readOnly={isCurrentFieldLocked}
              name="settings-security-current"
              data-lpignore="true"
              data-1p-ignore="true"
              data-bwignore="true"
              spellCheck={false}
            />
            <button
              type="button"
              onClick={toggleShowCurrent}
              className={passwordToggleButtonClass}
              aria-label={showCurrent ? t('settings.hidePassword') : t('settings.showPassword')}
            >
              {showCurrent ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="settings-newPassword" className={labelClass}>
            {t('settings.newPassword')}
          </label>
          <div className={inputGroupContainerClass}>
            <input
              id="settings-newPassword"
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => onNewPasswordChange(e.target.value)}
              onFocus={() => {
                if (isNewFieldLocked) {
                  setIsNewFieldLocked(false);
                }
              }}
              placeholder={t('settings.newPasswordPlaceholder')}
              className={`${inputClass} pr-12`}
              disabled={isSubmitting}
              autoComplete="off"
              readOnly={isNewFieldLocked}
              name="settings-security-new"
              data-lpignore="true"
              data-1p-ignore="true"
              data-bwignore="true"
              spellCheck={false}
            />
            <button
              type="button"
              onClick={toggleShowNew}
              className={passwordToggleButtonClass}
              aria-label={showNew ? t('settings.hidePassword') : t('settings.showPassword')}
            >
              {showNew ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          <p className="mt-1 text-xs text-arsm-muted dark:text-arsm-muted-dark">{t('settings.passwordHint')}</p>
        </div>

        <div>
          <label htmlFor="settings-confirmPassword" className={labelClass}>
            {t('settings.confirmNewPassword')}
          </label>
          <div className={inputGroupContainerClass}>
            <input
              id="settings-confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              value={confirmNewPassword}
              onChange={(e) => onConfirmNewPasswordChange(e.target.value)}
              onFocus={() => {
                if (isConfirmFieldLocked) {
                  setIsConfirmFieldLocked(false);
                }
              }}
              placeholder={t('settings.confirmPasswordPlaceholder')}
              className={`${inputClass} pr-12`}
              disabled={isSubmitting}
              autoComplete="off"
              readOnly={isConfirmFieldLocked}
              name="settings-security-confirm"
              data-lpignore="true"
              data-1p-ignore="true"
              data-bwignore="true"
              spellCheck={false}
            />
            <button
              type="button"
              onClick={toggleShowConfirm}
              className={passwordToggleButtonClass}
              aria-label={showConfirm ? t('settings.hidePassword') : t('settings.showPassword')}
            >
              {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !currentPassword || !newPassword || !confirmNewPassword}
          className={`w-full ${buttonClass}`}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? t('settings.changingCredentials') : t('settings.changePasswordButton')}
        </button>
      </form>
    </div>
  );
});

ChangePasswordSectionComponent.displayName = ChangePasswordSectionComponent.name;

/** Password update section rendered on the settings page. */
export const ChangePasswordSection = ChangePasswordSectionComponent;
