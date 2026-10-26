/** Basic identity/contact fields for mechanic registration. */

import { memo, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { FieldErrorText } from '../../../../components/common/FieldErrorText';
import { fieldErrorA11yProps } from '../../../../utils/fieldA11y';
import { credentialInputClass, inputClass, labelClass } from '../../../../utils/formStyles';
import { filterNameInput, filterPhoneInput } from '../../../../utils/validation';
import type { RegisterFieldErrors, RegisterFieldName, RegisterTextFieldName } from '../types';

interface BasicInfoSectionProps {
  readonly firstName: string;
  readonly middleName: string;
  readonly lastName: string;
  readonly email: string;
  readonly phoneNumber: string;
  readonly fieldErrors: RegisterFieldErrors;
  readonly isSubmitting: boolean;
  readonly onFieldChange: (field: RegisterTextFieldName, value: string) => void;
}

export const BasicInfoSection = memo(function BasicInfoSection({
  firstName,
  middleName,
  lastName,
  email,
  phoneNumber,
  fieldErrors,
  isSubmitting,
  onFieldChange,
}: BasicInfoSectionProps) {
  const { t } = useTranslation();
  const idPrefix = useId();
  const errorId = (field: RegisterFieldName) => `${idPrefix}-${field}-error`;

  return (
    <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div>
          <label htmlFor="firstName" className={labelClass}>
            {t('common.fields.firstName')} *
          </label>
          <input
            id="firstName"
            type="text"
            autoComplete="given-name"
            value={firstName}
            onChange={(event) => {
              onFieldChange('firstName', filterNameInput(event.target.value));
            }}
            placeholder={t('admin.firstNamePlaceholder')}
            className={inputClass}
            disabled={isSubmitting}
            required
            {...fieldErrorA11yProps(errorId('firstName'), fieldErrors.firstName)}
          />
          <FieldErrorText id={errorId('firstName')} messageKey={fieldErrors.firstName} />
        </div>

        <div>
          <label htmlFor="middleName" className={labelClass}>
            {t('common.fields.middleName')}
          </label>
          <input
            id="middleName"
            type="text"
            autoComplete="additional-name"
            value={middleName}
            onChange={(event) => {
              onFieldChange('middleName', filterNameInput(event.target.value));
            }}
            placeholder={t('admin.middleNamePlaceholder')}
            className={inputClass}
            disabled={isSubmitting}
            {...fieldErrorA11yProps(errorId('middleName'), fieldErrors.middleName)}
          />
          <FieldErrorText id={errorId('middleName')} messageKey={fieldErrors.middleName} />
        </div>

        <div>
          <label htmlFor="lastName" className={labelClass}>
            {t('common.fields.lastName')} *
          </label>
          <input
            id="lastName"
            type="text"
            autoComplete="family-name"
            value={lastName}
            onChange={(event) => {
              onFieldChange('lastName', filterNameInput(event.target.value));
            }}
            placeholder={t('admin.lastNamePlaceholder')}
            className={inputClass}
            disabled={isSubmitting}
            required
            {...fieldErrorA11yProps(errorId('lastName'), fieldErrors.lastName)}
          />
          <FieldErrorText id={errorId('lastName')} messageKey={fieldErrors.lastName} />
        </div>
      </div>

      <div>
        <label htmlFor="reg-email" className={labelClass}>
          {t('common.fields.email')} *
        </label>
        <input
          id="reg-email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(event) => {
            onFieldChange('email', event.target.value);
          }}
          placeholder={t('admin.emailPlaceholder')}
          className={credentialInputClass}
          disabled={isSubmitting}
          required
          {...fieldErrorA11yProps(errorId('email'), fieldErrors.email)}
        />
        <FieldErrorText id={errorId('email')} messageKey={fieldErrors.email} />
      </div>

      <div>
        <label htmlFor="reg-phone" className={labelClass}>
          {t('common.fields.phoneNumber')}
        </label>
        <input
          id="reg-phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phoneNumber}
          onChange={(event) => {
            onFieldChange('phoneNumber', filterPhoneInput(event.target.value));
          }}
          placeholder={t('common.placeholders.phone')}
          className={credentialInputClass}
          disabled={isSubmitting}
          {...fieldErrorA11yProps(errorId('phoneNumber'), fieldErrors.phoneNumber)}
        />
        <FieldErrorText id={errorId('phoneNumber')} messageKey={fieldErrors.phoneNumber} />
      </div>
    </>
  );
});
