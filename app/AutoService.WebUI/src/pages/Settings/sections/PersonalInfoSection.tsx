/**
 * Settings personal-information form section.
 *
 * Renders editable name, email, and phone fields with inline
 * server-validation message display.
 * @module pages/Settings/sections/PersonalInfoSection
 */

import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { buttonClass, cardClass, inputClass, labelClass, sectionTitleClass } from '../constants';
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
  readonly onSubmit: (event: React.SyntheticEvent) => void;
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
}: PersonalInfoSectionProps) {
  const { t } = useTranslation();

  return (
    <div className={cardClass}>
      <h2 className={sectionTitleClass}>
        {t('settings.personalInfo')}
      </h2>

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
              onChange={(event) => onFirstNameChange(filterNameInput(event.target.value))}
              placeholder={t('settings.firstNamePlaceholder')}
              className={inputClass}
              disabled={isSubmitting}
              autoComplete="given-name"
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
              onChange={(event) => onMiddleNameChange(filterNameInput(event.target.value))}
              placeholder={t('settings.middleNamePlaceholder')}
              className={inputClass}
              disabled={isSubmitting}
              autoComplete="additional-name"
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
              onChange={(event) => onLastNameChange(filterNameInput(event.target.value))}
              placeholder={t('settings.lastNamePlaceholder')}
              className={inputClass}
              disabled={isSubmitting}
              autoComplete="family-name"
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
            onChange={(event) => onEmailChange(event.target.value)}
            placeholder={t('settings.emailPlaceholder')}
            className={inputClass}
            disabled={isSubmitting}
            autoComplete="email"
          />
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
            onChange={(event) => onPhoneNumberChange(filterPhoneInput(event.target.value))}
            placeholder={t('settings.phonePlaceholder')}
            className={inputClass}
            disabled={isSubmitting}
            autoComplete="tel"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full ${buttonClass}`}
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
