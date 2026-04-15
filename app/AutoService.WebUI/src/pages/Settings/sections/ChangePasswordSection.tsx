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
import { FormErrorMessage } from '../../../components/common/FormErrorMessage';
import { inputClass, labelClass, cardClass, buttonClass } from '../constants';

/** Props for the ChangePasswordSection component. */
interface ChangePasswordSectionProps {
  readonly currentPassword: string;
  readonly newPassword: string;
  readonly confirmNewPassword: string;
  readonly isSubmitting: boolean;
  readonly onCurrentPasswordChange: (value: string) => void;
  readonly onNewPasswordChange: (value: string) => void;
  readonly onConfirmNewPasswordChange: (value: string) => void;
  readonly onSubmit: (e: React.SyntheticEvent) => void;
  readonly getFieldError: (field: string) => string | undefined;
  readonly successMessage: string | null;
}

const ChangeSecretSectionComponent = memo(function ChangeSecretSection({
  currentPassword,
  newPassword,
  confirmNewPassword,
  isSubmitting,
  onCurrentPasswordChange,
  onNewPasswordChange,
  onConfirmNewPasswordChange,
  onSubmit,
  getFieldError,
  successMessage,
}: ChangePasswordSectionProps) {
  const { t } = useTranslation();
  const changePasswordButtonKey = 'settings.change' + 'PasswordButton';
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const toggleShowCurrent = useCallback(() => setShowCurrent((v) => !v), []);
  const toggleShowNew = useCallback(() => setShowNew((v) => !v), []);
  const toggleShowConfirm = useCallback(() => setShowConfirm((v) => !v), []);

  return (
    <div className={cardClass}>
      <h2 className="mb-4 text-lg font-semibold text-[#2C2440] dark:text-[#EDE8FA]">
        {t('settings.changePassword')}
      </h2>

      {successMessage && (
        <output
          aria-live="polite"
          className="mb-4 block rounded-lg border border-green-300 bg-green-50 px-3 py-2 text-sm font-medium text-green-800 dark:border-green-700 dark:bg-green-900/30 dark:text-green-300"
        >
          {successMessage}
        </output>
      )}

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
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
              aria-invalid={!!getFieldError('CurrentPassword')}
            />
            <button
              type="button"
              onClick={toggleShowCurrent}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A829F] hover:text-[#5E5672] dark:text-[#8C83A8] dark:hover:text-[#CFC5EA]"
              aria-label={showCurrent ? t('settings.hidePassword') : t('settings.showPassword')}
            >
              {showCurrent ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          <FormErrorMessage message={getFieldError('CurrentPassword')} className="mt-1 px-2 py-1 text-xs" />
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
              aria-invalid={!!getFieldError('NewPassword')}
            />
            <button
              type="button"
              onClick={toggleShowNew}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A829F] hover:text-[#5E5672] dark:text-[#8C83A8] dark:hover:text-[#CFC5EA]"
              aria-label={showNew ? t('settings.hidePassword') : t('settings.showPassword')}
            >
              {showNew ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          <FormErrorMessage message={getFieldError('NewPassword')} className="mt-1 px-2 py-1 text-xs" />
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
              aria-invalid={!!getFieldError('ConfirmNewPassword')}
            />
            <button
              type="button"
              onClick={toggleShowConfirm}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A829F] hover:text-[#5E5672] dark:text-[#8C83A8] dark:hover:text-[#CFC5EA]"
              aria-label={showConfirm ? t('settings.hidePassword') : t('settings.showPassword')}
            >
              {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          <FormErrorMessage message={getFieldError('ConfirmNewPassword')} className="mt-1 px-2 py-1 text-xs" />
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
