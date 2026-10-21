/** Settings company-data form (Admin only): the quote PDF letterhead fields with inline validation display. */

import { memo, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Save } from 'lucide-react';
import { FieldErrorText } from '../../../components/common/FieldErrorText';
import { ConfirmModal } from '../../../components/common/ConfirmModal';
import { fieldErrorA11yProps } from '../../../utils/fieldA11y';
import {
  buttonClass,
  cardClass,
  defaultIconClass,
  inputClass,
  labelClass,
  mutedBodyTextClass,
  mutedMetaTextClass,
  sectionTitleClass,
} from '../../../utils/formStyles';
import { filterPhoneInput } from '../../../utils/validation';
import { COMPANY_FIELD_MAX_LENGTHS, type CompanyFieldErrors, type CompanyFieldName, type CompanyFieldValues } from '../companyProfileFields';

/** Props for the CompanyDataSection component. */
interface CompanyDataSectionProps {
  readonly values: CompanyFieldValues;
  readonly fieldErrors: CompanyFieldErrors;
  readonly isLoading: boolean;
  readonly isSaveEnabled: boolean;
  readonly saveDisabledReasonKey: string | null;
  readonly isSubmitting: boolean;
  readonly isConfirmOpen: boolean;
  readonly onFieldChange: (field: CompanyFieldName, value: string) => void;
  readonly onSubmit: (event: React.SyntheticEvent) => void;
  readonly onConfirm: () => void;
  readonly onCloseConfirm: () => void;
}

/** Label, input kind and autofill hint of one company data field. */
interface CompanyFieldDescriptor {
  readonly field: CompanyFieldName;
  readonly labelKey: string;
  readonly placeholderKey?: string;
  readonly type?: 'email' | 'tel';
  readonly autoComplete?: string;
}

const NAME_FIELD: CompanyFieldDescriptor = { field: 'name', labelKey: 'settings.company.name', autoComplete: 'organization' };
const POSTAL_CODE_FIELD: CompanyFieldDescriptor = { field: 'postalCode', labelKey: 'settings.company.postalCode', autoComplete: 'postal-code' };
const CITY_FIELD: CompanyFieldDescriptor = { field: 'city', labelKey: 'settings.company.city', autoComplete: 'address-level2' };
const ADDRESS_LINE_FIELD: CompanyFieldDescriptor = { field: 'addressLine', labelKey: 'settings.company.addressLine', autoComplete: 'address-line1' };
const TAX_NUMBER_FIELD: CompanyFieldDescriptor = { field: 'taxNumber', labelKey: 'settings.company.taxNumber', placeholderKey: 'settings.company.taxNumberPlaceholder' };
const PHONE_FIELD: CompanyFieldDescriptor = { field: 'phoneNumber', labelKey: 'common.fields.phoneNumber', placeholderKey: 'common.placeholders.phone', type: 'tel', autoComplete: 'tel' };
const EMAIL_FIELD: CompanyFieldDescriptor = { field: 'email', labelKey: 'common.fields.email', type: 'email', autoComplete: 'email' };

/** Company-data editor used on the settings page for the Admin role. */
export const CompanyDataSection = memo(function CompanyDataSection({
  values,
  fieldErrors,
  isLoading,
  isSaveEnabled,
  saveDisabledReasonKey,
  isSubmitting,
  isConfirmOpen,
  onFieldChange,
  onSubmit,
  onConfirm,
  onCloseConfirm,
}: CompanyDataSectionProps) {
  const { t } = useTranslation();
  const idPrefix = useId();
  const saveDisabledHintId = `${idPrefix}-save-disabled-hint`;
  const errorId = (field: CompanyFieldName) => `${idPrefix}-${field}-error`;
  const isBusy = isSubmitting || isLoading;
  const isSaveDisabled = isBusy || !isSaveEnabled;
  const saveDisabledHintText = saveDisabledReasonKey ? t(saveDisabledReasonKey) : '';
  const shouldShowSaveDisabledHint = isSaveDisabled && Boolean(saveDisabledReasonKey);
  const saveDisabledTitle = shouldShowSaveDisabledHint ? saveDisabledHintText : undefined;

  const renderField = ({ field, labelKey, placeholderKey, type, autoComplete }: CompanyFieldDescriptor) => (
    <div key={field}>
      <label htmlFor={`${idPrefix}-${field}`} className={labelClass}>
        {t(labelKey)}
      </label>
      <input
        id={`${idPrefix}-${field}`}
        type={type ?? 'text'}
        inputMode={type === 'tel' ? 'tel' : undefined}
        value={values[field]}
        onChange={(event) => {
          onFieldChange(field, field === 'phoneNumber' ? filterPhoneInput(event.target.value) : event.target.value);
        }}
        placeholder={placeholderKey ? t(placeholderKey) : undefined}
        className={inputClass}
        disabled={isBusy}
        maxLength={COMPANY_FIELD_MAX_LENGTHS[field]}
        autoComplete={autoComplete}
        {...fieldErrorA11yProps(errorId(field), fieldErrors[field])}
      />
      <FieldErrorText id={errorId(field)} messageKey={fieldErrors[field]} />
    </div>
  );

  return (
    <div className={cardClass}>
      <h2 className={sectionTitleClass}>
        {t('settings.company.title')}
      </h2>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {renderField(NAME_FIELD)}

        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
          {renderField(POSTAL_CODE_FIELD)}
          {renderField(CITY_FIELD)}
        </div>

        {renderField(ADDRESS_LINE_FIELD)}
        {renderField(TAX_NUMBER_FIELD)}
        {renderField(PHONE_FIELD)}
        {renderField(EMAIL_FIELD)}

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

      <ConfirmModal
        isOpen={isConfirmOpen}
        title={t('settings.confirmSaveTitle')}
        isBusy={isSubmitting}
        onClose={onCloseConfirm}
        onConfirm={onConfirm}
        confirmLabel={t('common.actions.save')}
        busyLabel={t('common.actions.saving')}
        icon={Save}
      >
        <p className={mutedBodyTextClass}>{t('settings.company.confirmSaveMessage')}</p>
      </ConfirmModal>
    </div>
  );
});
