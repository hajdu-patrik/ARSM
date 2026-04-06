import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FormErrorMessage } from '../../../components/common/FormErrorMessage';
import { inputClass, labelClass, cardClass, buttonClass } from '../constants';

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

const EyeIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const EyeSlashIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
  </svg>
);

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
            />
            <button
              type="button"
              onClick={toggleShowCurrent}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A829F] hover:text-[#5E5672] dark:text-[#8C83A8] dark:hover:text-[#CFC5EA]"
              aria-label={showCurrent ? t('settings.hidePassword') : t('settings.showPassword')}
            >
              {showCurrent ? <EyeSlashIcon /> : <EyeIcon />}
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
            />
            <button
              type="button"
              onClick={toggleShowNew}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A829F] hover:text-[#5E5672] dark:text-[#8C83A8] dark:hover:text-[#CFC5EA]"
              aria-label={showNew ? t('settings.hidePassword') : t('settings.showPassword')}
            >
              {showNew ? <EyeSlashIcon /> : <EyeIcon />}
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
            />
            <button
              type="button"
              onClick={toggleShowConfirm}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A829F] hover:text-[#5E5672] dark:text-[#8C83A8] dark:hover:text-[#CFC5EA]"
              aria-label={showConfirm ? t('settings.hidePassword') : t('settings.showPassword')}
            >
              {showConfirm ? <EyeSlashIcon /> : <EyeIcon />}
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

export const ChangePasswordSection = ChangeSecretSectionComponent;
