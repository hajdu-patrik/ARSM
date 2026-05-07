/**
 * Basic identity/contact fields for mechanic registration.
 * @module pages/Admin/RegisterMechanic/sections/BasicInfoSection
 */

import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { inputClass, labelClass } from '../constants';
import { filterNameInput, filterPhoneInput } from '../../../../utils/validation';

/** Props for the BasicInfoSection component. */
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
            autoComplete="given-name"
            value={firstName}
            onChange={(e) => onFirstNameChange(filterNameInput(e.target.value))}
            placeholder={t('admin.firstNamePlaceholder')}
            className={inputClass}
            disabled={isSubmitting}
            required
          />
        </div>

        <div>
          <label htmlFor="middleName" className={labelClass}>
            {t('admin.middleName')}
          </label>
          <input
            id="middleName"
            type="text"
            autoComplete="additional-name"
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
            autoComplete="family-name"
            value={lastName}
            onChange={(e) => onLastNameChange(filterNameInput(e.target.value))}
            placeholder={t('admin.lastNamePlaceholder')}
            className={inputClass}
            disabled={isSubmitting}
            required
          />
        </div>
      </div>

      <div>
        <label htmlFor="reg-email" className={labelClass}>
          {t('admin.email')} *
        </label>
        <input
          id="reg-email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          placeholder={t('admin.emailPlaceholder')}
          className={inputClass}
          disabled={isSubmitting}
          required
        />
      </div>

      <div>
        <label htmlFor="reg-phone" className={labelClass}>
          {t('admin.phoneNumber')}
        </label>
        <input
          id="reg-phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phoneNumber}
          onChange={(e) => onPhoneNumberChange(filterPhoneInput(e.target.value))}
          placeholder={t('admin.phonePlaceholder')}
          className={inputClass}
          disabled={isSubmitting}
        />
      </div>
    </>
  );
});

BasicInfoSectionComponent.displayName = 'BasicInfoSection';

/** Name and contact input section used by the mechanic registration form. */
export const BasicInfoSection = BasicInfoSectionComponent;
