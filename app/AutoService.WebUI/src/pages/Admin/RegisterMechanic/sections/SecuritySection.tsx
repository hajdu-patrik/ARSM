/**
 * Password input section for mechanic registration.
 * @module pages/Admin/RegisterMechanic/sections/SecuritySection
 */

import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff } from 'lucide-react';
import { FormErrorMessage } from '../../../../components/common/FormErrorMessage';
import { inputClass, labelClass } from '../constants';
import type { GetFieldError } from '../types';

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
  readonly getFieldError: GetFieldError;
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
  getFieldError,
}: SecuritySectionProps) {
  const { t } = useTranslation();
  const credentialError = getFieldError('password');
  const confirmPasswordError = getFieldError('confirmPassword');
  const credentialHintId = 'reg-credential-hint';
  const credentialErrorId = 'reg-credential-error';
  const credentialDescribedBy = credentialError ? `${credentialHintId} ${credentialErrorId}` : credentialHintId;
  const confirmPasswordErrorId = 'reg-confirm-password-error';

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="reg-password" className={labelClass}>
          {t('admin.password')} *
        </label>
        <div className="relative">
          <input
            id="reg-password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            placeholder={t('admin.passwordPlaceholder')}
            className={inputClass}
            disabled={isSubmitting}
            required
            minLength={8}
            autoComplete="new-password"
            aria-invalid={!!credentialError}
            aria-describedby={credentialDescribedBy}
          />
          <button
            type="button"
            onClick={onToggleShowPassword}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-arsm-accent-vivid transition hover:bg-arsm-accent-wash hover:text-arsm-accent-deep dark:text-arsm-accent dark:hover:bg-arsm-deep dark:hover:text-arsm-accent-tint"
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
        <FormErrorMessage id={credentialError ? credentialErrorId : undefined} message={credentialError} className="mt-1 px-2 py-1 text-xs" />
      </div>

      <div>
        <label htmlFor="reg-confirm-password" className={labelClass}>
          {t('admin.confirmPassword')} *
        </label>
        <div className="relative">
          <input
            id="reg-confirm-password"
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(event) => onConfirmPasswordChange(event.target.value)}
            placeholder={t('admin.confirmPasswordPlaceholder')}
            className={inputClass}
            disabled={isSubmitting}
            required
            minLength={8}
            autoComplete="new-password"
            aria-invalid={!!confirmPasswordError}
            aria-describedby={confirmPasswordError ? confirmPasswordErrorId : undefined}
          />
          <button
            type="button"
            onClick={onToggleShowConfirmPassword}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-arsm-accent-vivid transition hover:bg-arsm-accent-wash hover:text-arsm-accent-deep dark:text-arsm-accent dark:hover:bg-arsm-deep dark:hover:text-arsm-accent-tint"
            aria-label={showConfirmPassword ? t('login.hidePassword') : t('login.showPassword')}
          >
            {showConfirmPassword ? (
              <Eye className="h-5 w-5" aria-hidden="true" />
            ) : (
              <EyeOff className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
        <FormErrorMessage id={confirmPasswordError ? confirmPasswordErrorId : undefined} message={confirmPasswordError} className="mt-1 px-2 py-1 text-xs" />
      </div>
    </div>
  );
});

SecuritySectionComponent.displayName = 'SecuritySection';

/** Password and visibility-toggle section for registration. */
export const SecuritySection = SecuritySectionComponent;
