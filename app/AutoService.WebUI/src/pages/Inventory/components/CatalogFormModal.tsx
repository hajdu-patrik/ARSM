/** Generic part/labor-type create/edit modal (uppercase identifier, net rate, live gross preview) driven by a `CatalogFormModalConfig`. */
import { useId, type Dispatch, type SetStateAction, type SyntheticEvent } from 'react';
import type { TFunction } from 'i18next';
import { Save } from 'lucide-react';
import { Dropdown, type DropdownOption } from '../../../components/common/Dropdown';
import { FieldErrorText } from '../../../components/common/FieldErrorText';
import { Modal } from '../../../components/common/Modal';
import { MAX_CATALOG_IDENTIFIER_LENGTH, MAX_CATALOG_NAME_LENGTH, VAT_RATE_OPTIONS } from '../../../types/catalog/catalog.types';
import { formatHufUnitPrice } from '../../../utils/currency';
import { fieldErrorA11yProps } from '../../../utils/fieldA11y';
import {
  buttonClass,
  defaultIconClass,
  formFieldGridClass,
  formFieldGroupClass,
  inputClass,
  labelClass,
  readonlyInputClass,
  secondaryButtonClass,
} from '../../../utils/formStyles';
import type { CatalogFormModalConfig } from '../catalogForm.config';
import {
  computeLiveGrossPreview,
  type CatalogFieldErrors,
  type CatalogFieldName,
  type CatalogFormState,
  type CatalogModalMode,
} from '../helpers';

/** VAT choices of the dropdown; values are strings, the form keeps the number. */
const VAT_DROPDOWN_OPTIONS: readonly DropdownOption[] = VAT_RATE_OPTIONS.map((rate) => ({
  value: String(rate),
  label: `${String(rate)}%`,
}));

interface CatalogFormModalProps {
  readonly isOpen: boolean;
  readonly mode: CatalogModalMode;
  readonly isSaving: boolean;
  readonly isSaveEnabled: boolean;
  readonly form: CatalogFormState;
  readonly fieldErrors: CatalogFieldErrors;
  readonly locale: string;
  readonly t: TFunction;
  readonly onClose: () => void;
  readonly onSubmit: (event: SyntheticEvent) => void;
  readonly setForm: Dispatch<SetStateAction<CatalogFormState>>;
  readonly config: CatalogFormModalConfig;
}

export function CatalogFormModal({
  isOpen,
  mode,
  isSaving,
  isSaveEnabled,
  form,
  fieldErrors,
  locale,
  t,
  onClose,
  onSubmit,
  setForm,
  config,
}: CatalogFormModalProps) {
  const errorIdPrefix = useId();
  const errorId = (field: CatalogFieldName) => `${errorIdPrefix}-${field}-error`;
  const vatRateA11y = fieldErrorA11yProps(errorId('vatRate'), fieldErrors.vatRate);
  const grossPreview = computeLiveGrossPreview(Number(form.rate), form.vatRatePercent);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? t(config.createTitleKey) : t(config.editTitleKey)}
      widthClassName="max-w-lg"
      footerClassName="arsm-modal-footer-confirm"
      footer={(
        <>
          <button type="button" onClick={onClose} disabled={isSaving} className={secondaryButtonClass}>
            {t('common.actions.cancel')}
          </button>
          <button
            type="submit"
            form={config.formElementId}
            disabled={isSaving || !isSaveEnabled}
            aria-busy={isSaving}
            className={buttonClass}
          >
            <Save className={defaultIconClass} />
            <span>{isSaving ? t('common.actions.saving') : t('common.actions.save')}</span>
          </button>
        </>
      )}
    >
      <form id={config.formElementId} onSubmit={onSubmit} className="space-y-3" noValidate>
        <div className={formFieldGridClass}>
          <div className={formFieldGroupClass}>
            <label htmlFor={config.identifier.elementId} className={labelClass}>{t(config.identifier.labelKey)}</label>
            <input
              id={config.identifier.elementId}
              type="text"
              value={form.identifier}
              onChange={(event) => {
                setForm((prev) => ({ ...prev, identifier: event.target.value.toUpperCase() }));
              }}
              className={`${inputClass} uppercase`}
              placeholder={t(config.identifier.placeholderKey)}
              maxLength={MAX_CATALOG_IDENTIFIER_LENGTH}
              disabled={isSaving}
              {...fieldErrorA11yProps(errorId('identifier'), fieldErrors.identifier)}
            />
            <FieldErrorText id={errorId('identifier')} messageKey={fieldErrors.identifier} />
          </div>

          <div className={formFieldGroupClass}>
            <label htmlFor={config.nameElementId} className={labelClass}>{t('inventory.name')}</label>
            <input
              id={config.nameElementId}
              type="text"
              value={form.name}
              onChange={(event) => {
                setForm((prev) => ({ ...prev, name: event.target.value }));
              }}
              className={inputClass}
              placeholder={t('inventory.namePlaceholder')}
              maxLength={MAX_CATALOG_NAME_LENGTH}
              disabled={isSaving}
              {...fieldErrorA11yProps(errorId('name'), fieldErrors.name)}
            />
            <FieldErrorText id={errorId('name')} messageKey={fieldErrors.name} />
          </div>
        </div>

        <div className={formFieldGridClass}>
          <div className={formFieldGroupClass}>
            <label htmlFor={config.rate.elementId} className={labelClass}>{t(config.rate.labelKey)}</label>
            <input
              id={config.rate.elementId}
              type="number"
              min="0"
              max="100000000"
              step="0.01"
              value={form.rate}
              onChange={(event) => {
                setForm((prev) => ({ ...prev, rate: event.target.value }));
              }}
              className={inputClass}
              placeholder={t(config.rate.placeholderKey)}
              disabled={isSaving}
              {...fieldErrorA11yProps(errorId('rate'), fieldErrors.rate)}
            />
            <FieldErrorText id={errorId('rate')} messageKey={fieldErrors.rate} />
          </div>

          <div className={formFieldGroupClass}>
            <label htmlFor={config.vatRateElementId} className={labelClass}>{t('common.fields.vatRate')}</label>
            <Dropdown
              id={config.vatRateElementId}
              data-testid={config.vatRateElementId}
              size="field"
              value={String(form.vatRatePercent)}
              options={VAT_DROPDOWN_OPTIONS}
              placeholder={t('common.fields.vatRate')}
              onChange={(value) => {
                setForm((prev) => ({ ...prev, vatRatePercent: Number(value) }));
              }}
              disabled={isSaving}
              ariaInvalid={vatRateA11y['aria-invalid']}
              ariaDescribedBy={vatRateA11y['aria-describedby']}
            />
            <FieldErrorText id={errorId('vatRate')} messageKey={fieldErrors.vatRate} />
          </div>
        </div>

        <div className={formFieldGroupClass}>
          <label htmlFor={config.grossPreviewElementId} className={labelClass}>{t(config.grossPreviewLabelKey)}</label>
          <input
            id={config.grossPreviewElementId}
            type="text"
            readOnly
            value={formatHufUnitPrice(grossPreview, locale)}
            className={readonlyInputClass}
          />
        </div>
      </form>
    </Modal>
  );
}
