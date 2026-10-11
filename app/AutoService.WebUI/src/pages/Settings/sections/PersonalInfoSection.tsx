/** Settings personal-information form: editable name/email/phone fields with inline server-validation display. */

import { memo, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Save } from 'lucide-react';
import { FieldErrorText } from '../../../components/common/FieldErrorText';
import { fieldErrorA11yProps } from '../../../utils/fieldA11y';
import { buttonClass, cardClass, defaultIconClass, inputClass, labelClass, mutedMetaTextClass, sectionTitleClass } from '../../../utils/formStyles';
import { filterNameInput, filterPhoneInput } from '../../../utils/validation';
import type { ProfileFieldErrors, ProfileFieldName, ProfileFieldValues } from '../profileFields';

/** Props for the PersonalInfoSection component. */
interface PersonalInfoSectionProps {
  readonly values: ProfileFieldValues;
  readonly fieldErrors: ProfileFieldErrors;
  readonly isSaveEnabled: boolean;
  readonly saveDisabledReasonKey: string | null;
  readonly isSubmitting: boolean;
  readonly onFieldChange: (field: ProfileFieldName, value: string) => void;
  readonly onSubmit: (event: React.SyntheticEvent) => void;
}

const PersonalInfoSectionComponent = memo(function PersonalInfoSection({
  values,
  fieldErrors,
  isSaveEnabled,
  saveDisabledReasonKey,
  isSubmitting,
  onFieldChange,
  onSubmit,
}: PersonalInfoSectionProps) {
  const { t } = useTranslation();
  const idPrefix = useId();
  const saveDisabledHintId = `${idPrefix}-save-disabled-hint`;
  const errorId = (field: ProfileFieldName) => `${idPrefix}-${field}-error`;
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
              value={values.firstName}
              onChange={(event) => {
                onFieldChange('firstName', filterNameInput(event.target.value));
              }}
              placeholder={t('settings.firstNamePlaceholder')}
              className={inputClass}
              disabled={isSubmitting}
              autoComplete="given-name"
              {...fieldErrorA11yProps(errorId('firstName'), fieldErrors.firstName)}
            />
            <FieldErrorText id={errorId('firstName')} messageKey={fieldErrors.firstName} />
          </div>

          <div>
            <label htmlFor="settings-middleName" className={labelClass}>
              {t('common.fields.middleName')}
            </label>
            <input
              id="settings-middleName"
              type="text"
              value={values.middleName}
              onChange={(event) => {
                onFieldChange('middleName', filterNameInput(event.target.value));
              }}
              placeholder={t('settings.middleNamePlaceholder')}
              className={inputClass}
              disabled={isSubmitting}
              autoComplete="additional-name"
              {...fieldErrorA11yProps(errorId('middleName'), fieldErrors.middleName)}
            />
            <FieldErrorText id={errorId('middleName')} messageKey={fieldErrors.middleName} />
          </div>

          <div>
            <label htmlFor="settings-lastName" className={labelClass}>
              {t('common.fields.lastName')}
            </label>
            <input
              id="settings-lastName"
              type="text"
              value={values.lastName}
              onChange={(event) => {
                onFieldChange('lastName', filterNameInput(event.target.value));
              }}
              placeholder={t('settings.lastNamePlaceholder')}
              className={inputClass}
              disabled={isSubmitting}
              autoComplete="family-name"
              {...fieldErrorA11yProps(errorId('lastName'), fieldErrors.lastName)}
            />
            <FieldErrorText id={errorId('lastName')} messageKey={fieldErrors.lastName} />
          </div>
        </div>

        <div>
          <label htmlFor="settings-email" className={labelClass}>
            {t('common.fields.email')}
          </label>
          <input
            id="settings-email"
            type="email"
            value={values.email}
            onChange={(event) => {
              onFieldChange('email', event.target.value);
            }}
            placeholder={t('settings.emailPlaceholder')}
            className={inputClass}
            disabled={isSubmitting}
            autoComplete="email"
            {...fieldErrorA11yProps(errorId('email'), fieldErrors.email)}
          />
          <FieldErrorText id={errorId('email')} messageKey={fieldErrors.email} />
        </div>

        <div>
          <label htmlFor="settings-phone" className={labelClass}>
            {t('common.fields.phoneNumber')}
          </label>
          <input
            id="settings-phone"
            type="tel"
            inputMode="tel"
            value={values.phoneNumber}
            onChange={(event) => {
              onFieldChange('phoneNumber', filterPhoneInput(event.target.value));
            }}
            placeholder={t('common.placeholders.phone')}
            className={inputClass}
            disabled={isSubmitting}
            autoComplete="tel"
            {...fieldErrorA11yProps(errorId('phoneNumber'), fieldErrors.phoneNumber)}
          />
          <FieldErrorText id={errorId('phoneNumber')} messageKey={fieldErrors.phoneNumber} />
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
