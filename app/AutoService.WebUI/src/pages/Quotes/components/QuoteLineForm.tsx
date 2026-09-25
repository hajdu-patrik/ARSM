/**
 * Inline add/edit form for a single quote line.
 *
 * The same component serves part and labor lines; only the labels change,
 * because what the PDF prints as "hourly rate" has to read as an hourly rate
 * here too. While typing, the form shows a preview computed with the
 * server formula; the saved amounts always come from the server DTO.
 * @module pages/Quotes/components/QuoteLineForm
 */
import { memo, type Dispatch, type SetStateAction } from 'react';
import type { TFunction } from 'i18next';
import { Check, X } from 'lucide-react';
import type { LaborTypeDto, PartDto } from '../../../types/catalog/catalog.types';
import { VAT_RATE_OPTIONS } from '../../../types/catalog/catalog.types';
import { MAX_QUOTE_LINE_DESCRIPTION_LENGTH } from '../../../types/quotes/quotes.types';
import { formatHuf } from '../../../utils/currency';
import {
  compactDataSurfaceClass,
  compactPrimaryValueTextClass,
  defaultIconClass,
  formFieldGridClass,
  formFieldGroupClass,
  getSegmentedControlOptionClass,
  inputClassCompact,
  insetSurfaceClass,
  labelClass,
  mutedMetaTextClass,
  referenceChipNeutralButtonClass,
  referenceChipPrimaryButtonClass,
  segmentedControlClass,
  selectWrapperClass,
} from '../../../utils/formStyles';
import { applyCatalogSelection, computeQuoteLineAmountsPreview, resolveLineLabelKeys, type QuoteLineFormState } from '../helpers';

interface QuoteLineFormProps {
  readonly t: TFunction;
  readonly locale: string;
  readonly isSaving: boolean;
  readonly form: QuoteLineFormState;
  readonly setForm: Dispatch<SetStateAction<QuoteLineFormState>>;
  readonly parts: PartDto[];
  readonly laborTypes: LaborTypeDto[];
  readonly onSubmit: () => void;
  readonly onCancel: () => void;
}

const QuoteLineFormComponent = memo(function QuoteLineForm({
  t,
  locale,
  isSaving,
  form,
  setForm,
  parts,
  laborTypes,
  onSubmit,
  onCancel,
}: QuoteLineFormProps) {
  const { quantityKey, unitPriceKey } = resolveLineLabelKeys(form.lineKind);
  const preview = computeQuoteLineAmountsPreview(Number(form.quantity), Number(form.netUnitPrice), form.vatRatePercent);
  const catalogOptions = form.lineKind === 'Part'
    ? parts.map((part) => ({ id: part.id, label: `${part.partNumber} - ${part.name}` }))
    : laborTypes.map((laborType) => ({ id: laborType.id, label: `${laborType.code} - ${laborType.name}` }));

  return (
    <div data-testid="quote-line-editor" className={`min-w-0 space-y-3 ${insetSurfaceClass} p-3.5`}>
      <div className={`${segmentedControlClass} max-w-xs`}>
        <button
          data-testid="quote-line-kind-part"
          type="button"
          aria-pressed={form.lineKind === 'Part'}
          onClick={() => setForm((previous) => ({ ...previous, lineKind: 'Part', catalogId: '' }))}
          disabled={isSaving}
          className={getSegmentedControlOptionClass(form.lineKind === 'Part')}
        >
          {t('quotes.line.kindPart')}
        </button>
        <button
          data-testid="quote-line-kind-labor"
          type="button"
          aria-pressed={form.lineKind === 'Labor'}
          onClick={() => setForm((previous) => ({ ...previous, lineKind: 'Labor', catalogId: '' }))}
          disabled={isSaving}
          className={getSegmentedControlOptionClass(form.lineKind === 'Labor')}
        >
          {t('quotes.line.kindLabor')}
        </button>
      </div>

      <div className={formFieldGroupClass}>
        <label htmlFor="quote-line-catalog" className={labelClass}>
          {form.lineKind === 'Part' ? t('quotes.line.kindPart') : t('quotes.line.laborCatalog')}
        </label>
        <div className={selectWrapperClass}>
          <select
            data-testid="quote-line-catalog-select"
            id="quote-line-catalog"
            value={form.catalogId}
            onChange={(event) => setForm((previous) => applyCatalogSelection(previous, event.target.value, parts, laborTypes))}
            className={`${inputClassCompact} min-w-0 truncate`}
            disabled={isSaving}
          >
            <option value="">{t('quotes.line.catalogNone')}</option>
            {catalogOptions.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className={formFieldGroupClass}>
        <label htmlFor="quote-line-description" className={labelClass}>{t('quotes.line.description')}</label>
        <input
          data-testid="quote-line-description-input"
          id="quote-line-description"
          type="text"
          value={form.description}
          onChange={(event) => setForm((previous) => ({ ...previous, description: event.target.value }))}
          className={inputClassCompact}
          placeholder={t('quotes.line.descriptionPlaceholder')}
          maxLength={MAX_QUOTE_LINE_DESCRIPTION_LENGTH}
          disabled={isSaving}
        />
      </div>

      <div className={formFieldGridClass}>
        <div className={formFieldGroupClass}>
          <label htmlFor="quote-line-quantity" className={labelClass}>{t(quantityKey)}</label>
          <input
            data-testid="quote-line-quantity-input"
            id="quote-line-quantity"
            type="number"
            min="0"
            max="10000"
            step="0.01"
            value={form.quantity}
            onChange={(event) => setForm((previous) => ({ ...previous, quantity: event.target.value }))}
            className={inputClassCompact}
            disabled={isSaving}
          />
        </div>

        <div className={formFieldGroupClass}>
          <label htmlFor="quote-line-net-price" className={labelClass}>{t(unitPriceKey)}</label>
          <input
            data-testid="quote-line-net-price-input"
            id="quote-line-net-price"
            type="number"
            min="0"
            max="100000000"
            step="0.01"
            value={form.netUnitPrice}
            onChange={(event) => setForm((previous) => ({ ...previous, netUnitPrice: event.target.value }))}
            className={inputClassCompact}
            disabled={isSaving}
          />
        </div>
      </div>

      <div className={formFieldGridClass}>
        <div className={formFieldGroupClass}>
          <label htmlFor="quote-line-vat" className={labelClass}>{t('common.fields.vatRate')}</label>
          <div className={selectWrapperClass}>
            <select
              data-testid="quote-line-vat-select"
              id="quote-line-vat"
              value={form.vatRatePercent}
              onChange={(event) => setForm((previous) => ({ ...previous, vatRatePercent: Number(event.target.value) }))}
              className={`${inputClassCompact} min-w-0 truncate`}
              disabled={isSaving}
            >
              {VAT_RATE_OPTIONS.map((rate) => (
                <option key={rate} value={rate}>{rate}%</option>
              ))}
            </select>
          </div>
        </div>

        <div className={compactDataSurfaceClass}>
          <p className={mutedMetaTextClass}>{t('quotes.line.previewLabel')}</p>
          <p data-testid="quote-line-preview" className={`truncate tabular-nums ${compactPrimaryValueTextClass}`}>
            {t('quotes.line.previewValue', {
              net: formatHuf(preview.netAmount, locale),
              gross: formatHuf(preview.grossAmount, locale),
            })}
          </p>
        </div>
      </div>

      <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
        <button type="button" onClick={onCancel} disabled={isSaving} className={referenceChipNeutralButtonClass}>
          <X className={defaultIconClass} />
          <span className="truncate">{t('common.actions.cancel')}</span>
        </button>
        <button
          data-testid="quote-line-save-button"
          type="button"
          onClick={onSubmit}
          disabled={isSaving}
          aria-busy={isSaving}
          className={referenceChipPrimaryButtonClass}
        >
          <Check className={defaultIconClass} />
          <span className="truncate">{isSaving ? t('common.actions.saving') : t('quotes.line.save')}</span>
        </button>
      </div>
    </div>
  );
});

QuoteLineFormComponent.displayName = 'QuoteLineForm';

export const QuoteLineForm = QuoteLineFormComponent;
