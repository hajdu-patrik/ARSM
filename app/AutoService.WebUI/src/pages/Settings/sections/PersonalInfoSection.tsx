/**
 * Settings personal-information form section.
 *
 * Renders editable name, email, and phone fields with inline
 * server-validation message display.
 * @module pages/Settings/sections/PersonalInfoSection
 */

import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Save } from 'lucide-react';
import { buttonClass, cardClass, inputClass, labelClass, mutedMetaTextClass, sectionTitleClass } from '../constants';
import { filterNameInput, filterPhoneInput } from '../../../utils/validation';
import { defaultIconClass } from '../../../utils/formStyles';

/** Props for the PersonalInfoSection component. */
interface PersonalInfoSectionProps {
  readonly firstName: string;
  readonly middleName: string;
  readonly lastName: string;
  readonly email: string;
  readonly phoneNumber: string;
  readonly isSaveEnabled: boolean;
  readonly saveDisabledReasonKey: string | null;
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
  isSaveEnabled,
  saveDisabledReasonKey,
  isSubmitting,
  onFirstNameChange,
  onMiddleNameChange,
  onLastNameChange,
  onEmailChange,
  onPhoneNumberChange,
  onSubmit,
}: PersonalInfoSectionProps) {
  const { t } = useTranslation();
  const saveDisabledHintId = 'settings-profile-save-disabled-hint';
  const isSaveDisabled = isSubmitting || !isSaveEnabled;
  const saveDisabledHintText = saveDisabledReasonKey ? t(saveDisabledReasonKey) : '';
  const shouldShowSaveDisabledHint = isSaveDisabled && Boolean(saveDisabledReasonKey);
  const saveDisabledTitle = shouldShowSaveDisabledHint ? saveDisabledHintText : undefined;

  return (
    <div className={cardClass}>
      <h2 className={sectionTitleClass}>
        {t('common.fields.personalInformation')}
      </h2>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="settings-firstName" className={labelClass}>
              {t('common.fields.firstName')}
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
              {t('common.fields.middleName')}
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
              {t('common.fields.lastName')}
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
            {t('common.fields.email')}
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
            {t('common.fields.phoneNumber')}
          </label>
          <input
            id="settings-phone"
            type="tel"
            inputMode="tel"
            value={phoneNumber}
            onChange={(event) => onPhoneNumberChange(filterPhoneInput(event.target.value))}
            placeholder={t('common.placeholders.phone')}
            className={inputClass}
            disabled={isSubmitting}
            autoComplete="tel"
          />
        </div>

        <div className="w-full" title={saveDisabledTitle}>
          <button
            type="submit"
            disabled={isSaveDisabled}
            className={`w-full ${buttonClass}`}
            aria-busy={isSubmitting}
            aria-describedby={shouldShowSaveDisabledHint ? saveDisabledHintId : undefined}
          >
            <Save className={defaultIconClass} />
            <span>{isSubmitting ? t('common.actions.saving') : t('common.actions.saveChanges')}</span>
          </button>
        </div>
        {shouldShowSaveDisabledHint ? (
          <p id={saveDisabledHintId} className={mutedMetaTextClass}>
            {saveDisabledHintText}
          </p>
        ) : null}
      </form>
    </div>
  );
});

PersonalInfoSectionComponent.displayName = 'PersonalInfoSection';

/** Personal-information editor used on the settings page. */
export const PersonalInfoSection = PersonalInfoSectionComponent;
