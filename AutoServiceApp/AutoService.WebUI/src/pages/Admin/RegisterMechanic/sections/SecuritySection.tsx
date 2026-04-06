import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { FormErrorMessage } from '../../../../components/common/FormErrorMessage';
import { inputClass, labelClass } from '../constants';
import type { GetFieldError } from '../types';

interface SecuritySectionProps {
  readonly password: string;
  readonly showPassword: boolean;
  readonly isSubmitting: boolean;
  readonly onPasswordChange: (value: string) => void;
  readonly onToggleShowPassword: () => void;
  readonly getFieldError: GetFieldError;
}

const SecuritySectionComponent = memo(function SecuritySection({
  password,
  showPassword,
  isSubmitting,
  onPasswordChange,
  onToggleShowPassword,
  getFieldError,
}: SecuritySectionProps) {
  const { t } = useTranslation();

  return (
    <div>
      <label htmlFor="reg-password" className={labelClass}>
        {t('admin.password')} *
      </label>
      <div className="relative">
        <input
          id="reg-password"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          placeholder={t('admin.passwordPlaceholder')}
          className={inputClass}
          disabled={isSubmitting}
          required
          minLength={8}
        />
        <button
          type="button"
          onClick={onToggleShowPassword}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#6F54AD] transition hover:bg-[#EDE5FF] hover:text-[#5E4698] dark:text-[#C9B3FF] dark:hover:bg-[#2A253B] dark:hover:text-[#E2D9FF]"
          aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
        >
          {showPassword ? (
            <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          ) : (
            <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12s3.5-7 10-7c2.9 0 5.2 1.4 7 3" />
              <path d="M22 12s-3.5 7-10 7c-2.9 0-5.2-1.4-7-3" />
              <path d="M3 3l18 18" />
            </svg>
          )}
        </button>
      </div>
      <p className="mt-1 text-xs text-[#6A627F] dark:text-[#B9B0D3]">{t('admin.passwordHint')}</p>
      <FormErrorMessage message={getFieldError('password')} className="mt-1 px-2 py-1 text-xs" />
    </div>
  );
});

SecuritySectionComponent.displayName = 'SecuritySection';

export const SecuritySection = SecuritySectionComponent;
