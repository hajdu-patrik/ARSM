/**
 * Settings personal-information form section.
 *
 * Renders editable name, email, and phone fields with inline
 * server-validation message display.
 * @module pages/Settings/sections/PersonalInfoSection
 */

import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { FormErrorMessage } from '../../../components/common/FormErrorMessage';
import { inputClass, labelClass, cardClass, buttonClass } from '../constants';
import { filterNameInput, filterPhoneInput } from '../../../utils/validation';

/** Props for the PersonalInfoSection component. */
interface PersonalInfoSectionProps {
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
  readonly onSubmit: (e: React.SyntheticEvent) => void;
  readonly getFieldError: (field: string) => string | undefined;
  readonly successMessage: string | null;
}

const PersonalInfoSectionComponent = memo(function PersonalInfoSection({
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
  onSubmit,
  getFieldError,
  successMessage,
}: PersonalInfoSectionProps) {
  const { t } = useTranslation();

  return (
    <div className={cardClass}>
      <h2 className="mb-4 text-lg font-semibold text-arsm-primary dark:text-arsm-primary-dark">
        {t('settings.personalInfo')}
      </h2>

      {successMessage && (
        <output
          aria-live="polite"
          className="fade-in-up mb-4 block rounded-xl border border-arsm-success-border bg-arsm-success-bg px-4 py-2.5 text-sm font-semibold text-arsm-success-text shadow-[0_4px_14px_rgba(34,197,94,0.08)] dark:border-arsm-success-border-dark dark:bg-arsm-success-bg-dark dark:text-arsm-success-text-dark"
        >
          {successMessage}
        </output>
      )}

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="settings-firstName" className={labelClass}>
              {t('settings.firstName')}
            </label>
            <input
              id="settings-firstName"
              type="text"
              value={firstName}
              onChange={(e) => onFirstNameChange(filterNameInput(e.target.value))}
              placeholder={t('settings.firstNamePlaceholder')}
              className={inputClass}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label htmlFor="settings-middleName" className={labelClass}>
              {t('settings.middleName')}
            </label>
            <input
              id="settings-middleName"
              type="text"
              value={middleName}
              onChange={(e) => onMiddleNameChange(filterNameInput(e.target.value))}
              placeholder={t('settings.middleNamePlaceholder')}
              className={inputClass}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label htmlFor="settings-lastName" className={labelClass}>
              {t('settings.lastName')}
            </label>
            <input
              id="settings-lastName"
              type="text"
              value={lastName}
              onChange={(e) => onLastNameChange(filterNameInput(e.target.value))}
              placeholder={t('settings.lastNamePlaceholder')}
              className={inputClass}
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div>
          <label htmlFor="settings-email" className={labelClass}>
            {t('settings.email')}
          </label>
          <input
            id="settings-email"
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder={t('settings.emailPlaceholder')}
            className={inputClass}
            disabled={isSubmitting}
            aria-invalid={!!getFieldError('Email')}
          />
          <FormErrorMessage message={getFieldError('Email')} className="mt-1 px-2 py-1 text-xs" />
        </div>

        <div>
          <label htmlFor="settings-phone" className={labelClass}>
            {t('settings.phoneNumber')}
          </label>
          <input
            id="settings-phone"
            type="tel"
            inputMode="tel"
            value={phoneNumber}
            onChange={(e) => onPhoneNumberChange(filterPhoneInput(e.target.value))}
            placeholder={t('settings.phonePlaceholder')}
            className={inputClass}
            disabled={isSubmitting}
            aria-invalid={!!getFieldError('PhoneNumber')}
          />
          <FormErrorMessage message={getFieldError('PhoneNumber')} className="mt-1 px-2 py-1 text-xs" />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full sm:w-auto ${buttonClass}`}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? t('settings.saving') : t('settings.saveChanges')}
        </button>
      </form>
    </div>
  );
});

PersonalInfoSectionComponent.displayName = 'PersonalInfoSection';

/** Personal-information editor used on the settings page. */
export const PersonalInfoSection = PersonalInfoSectionComponent;
