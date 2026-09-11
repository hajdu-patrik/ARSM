/**
 * Labor type create/edit modal: hourly net rate is the input, gross hourly
 * rate is a read-only live preview mirroring the server formula.
 * @module pages/Inventory/components/LaborTypeFormModal
 */
import { memo, type Dispatch, type SetStateAction } from 'react';
import type { TFunction } from 'i18next';
import { Save } from 'lucide-react';
import { Modal } from '../../../components/common/Modal';
import { VAT_RATE_OPTIONS } from '../../../types/catalog/catalog.types';
import { formatHufUnitPrice } from '../../../utils/currency';
import {
  buttonClass,
  formFieldGridClass,
  formFieldGroupClass,
  inputClass,
  labelClass,
  readonlyInputClass,
  secondaryButtonClass,
  selectWrapperClass,
} from '../../../utils/formStyles';
import { computeLiveGrossPreview, type CatalogModalMode, type LaborTypeFormState } from '../helpers';

interface LaborTypeFormModalProps {
  readonly isOpen: boolean;
  readonly mode: CatalogModalMode;
  readonly isSaving: boolean;
  readonly isSaveEnabled: boolean;
  readonly form: LaborTypeFormState;
  readonly locale: string;
  readonly t: TFunction;
  readonly onClose: () => void;
  readonly onSubmit: (event: React.SyntheticEvent) => void;
  readonly setForm: Dispatch<SetStateAction<LaborTypeFormState>>;
}

const LaborTypeFormModalComponent = memo(function LaborTypeFormModal({
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
}: LaborTypeFormModalProps) {
  const grossPreview = computeLiveGrossPreview(Number(form.hourlyNetRate), form.vatRatePercent);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? t('inventory.createLaborType') : t('inventory.editLaborType')}
      widthClassName="max-w-lg"
      footerClassName="arsm-modal-footer-confirm"
      footer={(
        <>
          <button type="button" onClick={onClose} disabled={isSaving} className={secondaryButtonClass}>
            {t('settings.cancel')}
          </button>
          <button
            type="submit"
            form="inventory-labor-type-form"
            disabled={isSaving || !isSaveEnabled}
            aria-busy={isSaving}
            className={buttonClass}
          >
            <Save className="h-4 w-4 shrink-0" />
            <span>{isSaving ? t('inventory.saving') : t('inventory.save')}</span>
          </button>
        </>
      )}
    >
      <form id="inventory-labor-type-form" onSubmit={onSubmit} className="space-y-3" noValidate>
        <div className={formFieldGridClass}>
          <div className={formFieldGroupClass}>
            <label htmlFor="labor-type-code" className={labelClass}>{t('inventory.code')}</label>
            <input
              id="labor-type-code"
              type="text"
              value={form.code}
              onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))}
              className={`${inputClass} uppercase`}
              placeholder={t('inventory.codePlaceholder')}
              maxLength={40}
              disabled={isSaving}
            />
          </div>

          <div className={formFieldGroupClass}>
            <label htmlFor="labor-type-name" className={labelClass}>{t('inventory.name')}</label>
            <input
              id="labor-type-name"
              type="text"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              className={inputClass}
              placeholder={t('inventory.namePlaceholder')}
              maxLength={120}
              disabled={isSaving}
            />
          </div>
        </div>

        <div className={formFieldGridClass}>
          <div className={formFieldGroupClass}>
            <label htmlFor="labor-type-hourly-rate" className={labelClass}>{t('inventory.hourlyNetRate')}</label>
            <input
              id="labor-type-hourly-rate"
              type="number"
              min="0"
              max="100000000"
              step="0.01"
              value={form.hourlyNetRate}
              onChange={(event) => setForm((prev) => ({ ...prev, hourlyNetRate: event.target.value }))}
              className={inputClass}
              placeholder={t('inventory.hourlyNetRatePlaceholder')}
              disabled={isSaving}
            />
          </div>

          <div className={formFieldGroupClass}>
            <label htmlFor="labor-type-vat-rate" className={labelClass}>{t('inventory.vatRate')}</label>
            <div className={selectWrapperClass}>
              <select
                id="labor-type-vat-rate"
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
          <label htmlFor="labor-type-gross-rate" className={labelClass}>{t('inventory.grossHourlyRatePreview')}</label>
          <input
            id="labor-type-gross-rate"
            type="text"
            readOnly
            value={formatHufUnitPrice(grossPreview, locale)}
            className={readonlyInputClass}
          />
        </div>
      </form>
    </Modal>
  );
});

LaborTypeFormModalComponent.displayName = 'LaborTypeFormModal';

export const LaborTypeFormModal = LaborTypeFormModalComponent;
