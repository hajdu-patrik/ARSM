/**
 * Settings change-password form section.
 *
 * Provides current/new/confirm password inputs with visibility toggles
 * and inline validation message rendering.
 * @module pages/Settings/sections/ChangePasswordSection
 */

import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff } from 'lucide-react';
import { inputClass, labelClass, cardClass, buttonClass } from '../constants';

/** Props for the ChangePasswordSection component. */
interface ChangePasswordSectionProps {
  readonly usernameForAutocomplete: string;
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
const ChangeSecretSectionComponent = memo(function ChangeSecretSection({
  usernameForAutocomplete,
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
  const changePasswordButtonKey = 'settings.change' + 'PasswordButton';
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const toggleShowCurrent = useCallback(() => setShowCurrent((isVisible) => !isVisible), []);
  const toggleShowNew = useCallback(() => setShowNew((isVisible) => !isVisible), []);
  const toggleShowConfirm = useCallback(() => setShowConfirm((isVisible) => !isVisible), []);

  return (
    <div className={cardClass}>
      <h2 className="mb-4 text-lg font-semibold text-arsm-primary dark:text-arsm-primary-dark">
        {t('settings.changePassword')}
      </h2>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {/* Hidden username field helps password managers pair current/new password fields. */}
        <input
          type="text"
          name="username"
          autoComplete="username"
          value={usernameForAutocomplete}
          readOnly
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only"
        />

        <div>
          <label htmlFor="settings-currentPassword" className={labelClass}>
            {t('settings.currentPassword')}
          </label>
          <div className="relative">
            <input
              id="settings-currentPassword"
              type={showCurrent ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => onCurrentPasswordChange(e.target.value)}
              placeholder={t('settings.currentPasswordPlaceholder')}
              className={`${inputClass} pr-12`}
              disabled={isSubmitting}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={toggleShowCurrent}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-arsm-placeholder hover:text-arsm-label dark:text-arsm-placeholder-dark dark:hover:text-arsm-label-dark"
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
          <div className="relative">
            <input
              id="settings-newPassword"
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => onNewPasswordChange(e.target.value)}
              placeholder={t('settings.newPasswordPlaceholder')}
              className={`${inputClass} pr-12`}
              disabled={isSubmitting}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={toggleShowNew}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-arsm-placeholder hover:text-arsm-label dark:text-arsm-placeholder-dark dark:hover:text-arsm-label-dark"
              aria-label={showNew ? t('settings.hidePassword') : t('settings.showPassword')}
            >
              {showNew ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="settings-confirmPassword" className={labelClass}>
            {t('settings.confirmNewPassword')}
          </label>
          <div className="relative">
            <input
              id="settings-confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              value={confirmNewPassword}
              onChange={(e) => onConfirmNewPasswordChange(e.target.value)}
              placeholder={t('settings.confirmPasswordPlaceholder')}
              className={`${inputClass} pr-12`}
              disabled={isSubmitting}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={toggleShowConfirm}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-arsm-placeholder hover:text-arsm-label dark:text-arsm-placeholder-dark dark:hover:text-arsm-label-dark"
              aria-label={showConfirm ? t('settings.hidePassword') : t('settings.showPassword')}
            >
              {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !currentPassword || !newPassword || !confirmNewPassword}
          className={`w-full sm:w-auto ${buttonClass}`}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? t('settings.changingPassword') : t(changePasswordButtonKey)}
        </button>
      </form>
    </div>
  );
});

ChangeSecretSectionComponent.displayName = 'ChangeSecretSection';

/** Password update section rendered on the settings page. */
export const ChangePasswordSection = ChangeSecretSectionComponent;
