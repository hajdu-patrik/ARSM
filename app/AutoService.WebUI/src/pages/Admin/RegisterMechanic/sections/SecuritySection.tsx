/** Password input section for mechanic registration. */

import { memo, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff } from 'lucide-react';
import { FieldErrorText } from '../../../../components/common/FieldErrorText';
import { fieldErrorA11yProps } from '../../../../utils/fieldA11y';
import { inputClass, inputGroupContainerClass, labelClass, largeIconClass, mutedMetaTextClass, passwordToggleButtonClass } from '../../../../utils/formStyles';
import { MIN_PASSWORD_LENGTH } from '../../../../utils/validation';
import type { RegisterFieldErrors, RegisterTextFieldName } from '../types';

/** Props for the SecuritySection component. */
interface SecuritySectionProps {
  readonly password: string;
  readonly confirmPassword: string;
  readonly showPassword: boolean;
  readonly showConfirmPassword: boolean;
  readonly fieldErrors: RegisterFieldErrors;
  readonly isSubmitting: boolean;
  readonly onFieldChange: (field: RegisterTextFieldName, value: string) => void;
  readonly onToggleShowPassword: () => void;
  readonly onToggleShowConfirmPassword: () => void;
}

/** Password and visibility-toggle section for registration. */
export const SecuritySection = memo(function SecuritySection({
  password,
  confirmPassword,
  showPassword,
  showConfirmPassword,
  fieldErrors,
  isSubmitting,
  onFieldChange,
  onToggleShowPassword,
  onToggleShowConfirmPassword,
}: SecuritySectionProps) {
  const { t } = useTranslation();
  const idPrefix = useId();
  const credentialHintId = `${idPrefix}-credential-hint`;
  const passwordErrorId = `${idPrefix}-password-error`;
  const confirmPasswordErrorId = `${idPrefix}-confirm-password-error`;
  const isConfirmPasswordMismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const confirmPasswordErrorKey = fieldErrors.confirmPassword
    ?? (isConfirmPasswordMismatch ? 'common.validation.passwordMismatch' : undefined);
  // The always-visible password hint stays linked next to the error text.
  const passwordDescribedBy = fieldErrors.password === undefined
    ? credentialHintId
    : `${credentialHintId} ${passwordErrorId}`;

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="reg-password" className={labelClass}>
          {t('common.fields.password')} *
        </label>
        <div className={inputGroupContainerClass}>
          <input
            id="reg-password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(event) => {
              onFieldChange('password', event.target.value);
            }}
            placeholder={t('admin.passwordPlaceholder')}
            className={`${inputClass} pr-12`}
            disabled={isSubmitting}
            required
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
            {...fieldErrorA11yProps(passwordErrorId, fieldErrors.password)}
            aria-describedby={passwordDescribedBy}
          />
          <button
            type="button"
            onClick={onToggleShowPassword}
            className={passwordToggleButtonClass}
            aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
          >
            {showPassword ? (
              <EyeOff className={largeIconClass} aria-hidden="true" />
            ) : (
              <Eye className={largeIconClass} aria-hidden="true" />
            )}
          </button>
        </div>
        <FieldErrorText id={passwordErrorId} messageKey={fieldErrors.password} />
        <p id={credentialHintId} className={`mt-1 ${mutedMetaTextClass}`}>{t('common.validation.passwordHint')}</p>
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
            onChange={(event) => {
              onFieldChange('confirmPassword', event.target.value);
            }}
            placeholder={t('admin.confirmPasswordPlaceholder')}
            className={`${inputClass} pr-12`}
            disabled={isSubmitting}
            required
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
            {...fieldErrorA11yProps(confirmPasswordErrorId, confirmPasswordErrorKey)}
          />
          <button
            type="button"
            onClick={onToggleShowConfirmPassword}
            className={passwordToggleButtonClass}
            aria-label={showConfirmPassword ? t('login.hidePassword') : t('login.showPassword')}
          >
            {showConfirmPassword ? (
              <EyeOff className={largeIconClass} aria-hidden="true" />
            ) : (
              <Eye className={largeIconClass} aria-hidden="true" />
            )}
          </button>
        </div>
        <FieldErrorText id={confirmPasswordErrorId} messageKey={confirmPasswordErrorKey} />
      </div>
    </div>
  );
});
