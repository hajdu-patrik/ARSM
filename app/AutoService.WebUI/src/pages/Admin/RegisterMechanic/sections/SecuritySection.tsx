/**
 * Password input section for mechanic registration.
 * @module pages/Admin/RegisterMechanic/sections/SecuritySection
 */

import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff } from 'lucide-react';
import { inputClass, inputGroupContainerClass, labelClass, passwordToggleButtonClass } from '../constants';

/** Props for the SecuritySection component. */
interface SecuritySectionProps {
  readonly password: string;
  readonly confirmPassword: string;
  readonly showPassword: boolean;
  readonly showConfirmPassword: boolean;
  readonly isSubmitting: boolean;
  readonly onPasswordChange: (value: string) => void;
  readonly onConfirmPasswordChange: (value: string) => void;
  readonly onToggleShowPassword: () => void;
  readonly onToggleShowConfirmPassword: () => void;
}

const SecuritySectionComponent = memo(function SecuritySection({
  password,
  confirmPassword,
  showPassword,
  showConfirmPassword,
  isSubmitting,
  onPasswordChange,
  onConfirmPasswordChange,
  onToggleShowPassword,
  onToggleShowConfirmPassword,
}: SecuritySectionProps) {
  const { t } = useTranslation();
  const credentialHintId = 'reg-credential-hint';
  const isConfirmPasswordInvalid = confirmPassword.length > 0 && password !== confirmPassword;

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="reg-password" className={labelClass}>
          {t('admin.password')} *
        </label>
        <div className={inputGroupContainerClass}>
          <input
            id="reg-password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            placeholder={t('admin.passwordPlaceholder')}
            className={`${inputClass} pr-12`}
            disabled={isSubmitting}
            required
            minLength={8}
            autoComplete="new-password"
            aria-describedby={credentialHintId}
          />
          <button
            type="button"
            onClick={onToggleShowPassword}
            className={passwordToggleButtonClass}
            aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
          >
            {showPassword ? (
              <Eye className="h-5 w-5" aria-hidden="true" />
            ) : (
              <EyeOff className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
        <p id={credentialHintId} className="mt-1 text-xs text-arsm-muted dark:text-arsm-muted-dark">{t('admin.passwordHint')}</p>
      </div>

      <div>
        <label htmlFor="reg-confirm-password" className={labelClass}>
          {t('admin.confirmPassword')} *
        </label>
        <div className={inputGroupContainerClass}>
          <input
            id="reg-confirm-password"
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(event) => onConfirmPasswordChange(event.target.value)}
            placeholder={t('admin.confirmPasswordPlaceholder')}
            className={`${inputClass} pr-12`}
            disabled={isSubmitting}
            required
            minLength={8}
            autoComplete="new-password"
            aria-invalid={isConfirmPasswordInvalid}
          />
          <button
            type="button"
            onClick={onToggleShowConfirmPassword}
            className={passwordToggleButtonClass}
            aria-label={showConfirmPassword ? t('login.hidePassword') : t('login.showPassword')}
          >
            {showConfirmPassword ? (
              <Eye className="h-5 w-5" aria-hidden="true" />
            ) : (
              <EyeOff className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
});

SecuritySectionComponent.displayName = 'SecuritySection';

/** Password and visibility-toggle section for registration. */
export const SecuritySection = SecuritySectionComponent;
