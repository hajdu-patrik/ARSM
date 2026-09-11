/**
 * Part create/edit modal: net unit price is the input, gross unit price is
 * a read-only live preview mirroring the server formula.
 * @module pages/Inventory/components/PartFormModal
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
import { computeLiveGrossPreview, type CatalogModalMode, type PartFormState } from '../helpers';

interface PartFormModalProps {
  readonly isOpen: boolean;
  readonly mode: CatalogModalMode;
  readonly isSaving: boolean;
  readonly isSaveEnabled: boolean;
  readonly form: PartFormState;
  readonly locale: string;
  readonly t: TFunction;
  readonly onClose: () => void;
  readonly onSubmit: (event: React.SyntheticEvent) => void;
  readonly setForm: Dispatch<SetStateAction<PartFormState>>;
}

const PartFormModalComponent = memo(function PartFormModal({
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
}: PartFormModalProps) {
  const grossPreview = computeLiveGrossPreview(Number(form.netUnitPrice), form.vatRatePercent);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? t('inventory.createPart') : t('inventory.editPart')}
      widthClassName="max-w-lg"
      footerClassName="arsm-modal-footer-confirm"
      footer={(
        <>
          <button type="button" onClick={onClose} disabled={isSaving} className={secondaryButtonClass}>
            {t('settings.cancel')}
          </button>
          <button
            type="submit"
            form="inventory-part-form"
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
      <form id="inventory-part-form" onSubmit={onSubmit} className="space-y-3" noValidate>
        <div className={formFieldGridClass}>
          <div className={formFieldGroupClass}>
            <label htmlFor="part-number" className={labelClass}>{t('inventory.partNumber')}</label>
            <input
              id="part-number"
              type="text"
              value={form.partNumber}
              onChange={(event) => setForm((prev) => ({ ...prev, partNumber: event.target.value.toUpperCase() }))}
              className={`${inputClass} uppercase`}
              placeholder={t('inventory.partNumberPlaceholder')}
              maxLength={40}
              disabled={isSaving}
            />
          </div>

          <div className={formFieldGroupClass}>
            <label htmlFor="part-name" className={labelClass}>{t('inventory.name')}</label>
            <input
              id="part-name"
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
            <label htmlFor="part-net-price" className={labelClass}>{t('inventory.netUnitPrice')}</label>
            <input
              id="part-net-price"
              type="number"
              min="0"
              max="100000000"
              step="0.01"
              value={form.netUnitPrice}
              onChange={(event) => setForm((prev) => ({ ...prev, netUnitPrice: event.target.value }))}
              className={inputClass}
              placeholder={t('inventory.netUnitPricePlaceholder')}
              disabled={isSaving}
            />
          </div>

          <div className={formFieldGroupClass}>
            <label htmlFor="part-vat-rate" className={labelClass}>{t('inventory.vatRate')}</label>
            <div className={selectWrapperClass}>
              <select
                id="part-vat-rate"
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
          <label htmlFor="part-gross-price" className={labelClass}>{t('inventory.grossUnitPricePreview')}</label>
          <input
            id="part-gross-price"
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

PartFormModalComponent.displayName = 'PartFormModal';

export const PartFormModal = PartFormModalComponent;
