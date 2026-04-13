import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { FormErrorMessage } from '../../../../components/common/FormErrorMessage';
import { inputClass, labelClass } from '../constants';
import type { GetFieldError } from '../types';
import { filterNameInput, filterPhoneInput } from '../../../../utils/validation';

interface BasicInfoSectionProps {
  readonly firstName: string;
  readonly middleName: string;
  readonly lastName: string;
  readonly email: string;
  readonly phoneNumber: string;
  readonly isSubmitting: boolean;
  readonly onFirstNameChange: (value: string) => void;
  readonly onMiddleNameChange: (value: string) => void;
  readonly onLastNameChange: (value: string) => void;
  readonly onEmailChange: (value: string) => void;
  readonly onPhoneNumberChange: (value: string) => void;
  readonly getFieldError: GetFieldError;
}

const BasicInfoSectionComponent = memo(function BasicInfoSection({
  firstName,
  middleName,
  lastName,
  email,
  phoneNumber,
  isSubmitting,
  onFirstNameChange,
  onMiddleNameChange,
  onLastNameChange,
  onEmailChange,
  onPhoneNumberChange,
  getFieldError,
}: BasicInfoSectionProps) {
  const { t } = useTranslation();

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="firstName" className={labelClass}>
            {t('admin.firstName')} *
          </label>
          <input
            id="firstName"
            type="text"
            value={firstName}
            onChange={(e) => onFirstNameChange(filterNameInput(e.target.value))}
            placeholder={t('admin.firstNamePlaceholder')}
            className={inputClass}
            disabled={isSubmitting}
            required
            aria-invalid={!!getFieldError('firstName')}
          />
          <FormErrorMessage message={getFieldError('firstName')} className="mt-1 px-2 py-1 text-xs" />
        </div>

        <div>
          <label htmlFor="middleName" className={labelClass}>
            {t('admin.middleName')}
          </label>
          <input
            id="middleName"
            type="text"
            value={middleName}
            onChange={(e) => onMiddleNameChange(filterNameInput(e.target.value))}
            placeholder={t('admin.middleNamePlaceholder')}
            className={inputClass}
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label htmlFor="lastName" className={labelClass}>
            {t('admin.lastName')} *
          </label>
          <input
            id="lastName"
            type="text"
            value={lastName}
            onChange={(e) => onLastNameChange(filterNameInput(e.target.value))}
            placeholder={t('admin.lastNamePlaceholder')}
            className={inputClass}
            disabled={isSubmitting}
            required
            aria-invalid={!!getFieldError('lastName')}
          />
          <FormErrorMessage message={getFieldError('lastName')} className="mt-1 px-2 py-1 text-xs" />
        </div>
      </div>

      <div>
        <label htmlFor="reg-email" className={labelClass}>
          {t('admin.email')} *
        </label>
        <input
          id="reg-email"
          type="email"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          placeholder={t('admin.emailPlaceholder')}
          className={inputClass}
          disabled={isSubmitting}
          required
          aria-invalid={!!getFieldError('email')}
        />
        <FormErrorMessage message={getFieldError('email')} className="mt-1 px-2 py-1 text-xs" />
      </div>

      <div>
        <label htmlFor="reg-phone" className={labelClass}>
          {t('admin.phoneNumber')}
        </label>
        <input
          id="reg-phone"
          type="tel"
          inputMode="tel"
          value={phoneNumber}
          onChange={(e) => onPhoneNumberChange(filterPhoneInput(e.target.value))}
          placeholder={t('admin.phonePlaceholder')}
          className={inputClass}
          disabled={isSubmitting}
          aria-invalid={!!getFieldError('phoneNumber')}
        />
        <FormErrorMessage message={getFieldError('phoneNumber')} className="mt-1 px-2 py-1 text-xs" />
      </div>
    </>
  );
});

BasicInfoSectionComponent.displayName = 'BasicInfoSection';

export const BasicInfoSection = BasicInfoSectionComponent;
