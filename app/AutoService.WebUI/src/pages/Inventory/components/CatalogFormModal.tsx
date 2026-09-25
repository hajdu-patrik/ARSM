/**
 * Generic part/labor-type create/edit modal: the identifier is the
 * uppercase code/number, the rate is the net input, and the gross
 * amount is a read-only live preview mirroring the server formula.
 * Driven by a `CatalogFormModalConfig` so the Parts and Labor types
 * forms share one component instead of two near-identical ones.
 * @module pages/Inventory/components/CatalogFormModal
 */
import type { Dispatch, SetStateAction } from 'react';
import type { TFunction } from 'i18next';
import { Save } from 'lucide-react';
import { Modal } from '../../../components/common/Modal';
import { MAX_CATALOG_IDENTIFIER_LENGTH, MAX_CATALOG_NAME_LENGTH, VAT_RATE_OPTIONS } from '../../../types/catalog/catalog.types';
import { formatHufUnitPrice } from '../../../utils/currency';
import {
  buttonClass,
  defaultIconClass,
  formFieldGridClass,
  formFieldGroupClass,
  inputClass,
  labelClass,
  readonlyInputClass,
  secondaryButtonClass,
  selectWrapperClass,
} from '../../../utils/formStyles';
import type { CatalogFormModalConfig } from '../catalogForm.config';
import { computeLiveGrossPreview, type CatalogModalMode } from '../helpers';

interface CatalogFormModalProps<TForm extends { name: string; vatRatePercent: number }> {
  readonly isOpen: boolean;
  readonly mode: CatalogModalMode;
  readonly isSaving: boolean;
  readonly isSaveEnabled: boolean;
  readonly form: TForm;
  readonly locale: string;
  readonly t: TFunction;
  readonly onClose: () => void;
  readonly onSubmit: (event: React.SyntheticEvent) => void;
  readonly setForm: Dispatch<SetStateAction<TForm>>;
  readonly config: CatalogFormModalConfig<TForm>;
}

function CatalogFormModal<TForm extends { name: string; vatRatePercent: number }>({
  isOpen,
  mode,
  isSaving,
  isSaveEnabled,
  form,
  locale,
  t,
  onClose,
  onSubmit,
  setForm,
  config,
}: CatalogFormModalProps<TForm>) {
  const grossPreview = computeLiveGrossPreview(Number(config.rate.get(form)), form.vatRatePercent);

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
              data-testid={config.identifier.testId}
              type="text"
              value={config.identifier.get(form)}
              onChange={(event) => setForm((prev) => config.identifier.set(prev, event.target.value))}
              className={`${inputClass} uppercase`}
              placeholder={config.identifier.placeholderKey ? t(config.identifier.placeholderKey) : undefined}
              maxLength={MAX_CATALOG_IDENTIFIER_LENGTH}
              disabled={isSaving}
            />
          </div>

          <div className={formFieldGroupClass}>
            <label htmlFor={config.nameElementId} className={labelClass}>{t('inventory.name')}</label>
            <input
              id={config.nameElementId}
              type="text"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              className={inputClass}
              placeholder={t('inventory.namePlaceholder')}
              maxLength={MAX_CATALOG_NAME_LENGTH}
              disabled={isSaving}
            />
          </div>
        </div>

        <div className={formFieldGridClass}>
          <div className={formFieldGroupClass}>
            <label htmlFor={config.rate.elementId} className={labelClass}>{t(config.rate.labelKey)}</label>
            <input
              id={config.rate.elementId}
              data-testid={config.rate.testId}
              type="number"
              min="0"
              max="100000000"
              step="0.01"
              value={config.rate.get(form)}
              onChange={(event) => setForm((prev) => config.rate.set(prev, event.target.value))}
              className={inputClass}
              placeholder={config.rate.placeholderKey ? t(config.rate.placeholderKey) : undefined}
              disabled={isSaving}
            />
          </div>

          <div className={formFieldGroupClass}>
            <label htmlFor={config.vatRateElementId} className={labelClass}>{t('common.fields.vatRate')}</label>
            <div className={selectWrapperClass}>
              <select
                id={config.vatRateElementId}
                value={form.vatRatePercent}
                onChange={(event) => setForm((prev) => ({ ...prev, vatRatePercent: Number(event.target.value) }))}
                className={`${inputClass} min-w-0 truncate`}
                disabled={isSaving}
              >
                {VAT_RATE_OPTIONS.map((rate) => (
                  <option key={rate} value={rate}>{rate}%</option>
                ))}
              </select>
            </div>
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

CatalogFormModal.displayName = 'CatalogFormModal';

export { CatalogFormModal };
