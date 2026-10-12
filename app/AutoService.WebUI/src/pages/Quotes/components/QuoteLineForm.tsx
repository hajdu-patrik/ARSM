/** Inline add/edit quote line form; part and labor share it, only labels differ. Live preview mirrors the server formula (see CLAUDE.md); saved amounts come from the DTO. */
import { memo, useId, useState, type Dispatch, type SetStateAction } from 'react';
import type { TFunction } from 'i18next';
import { Check, X } from 'lucide-react';
import { Dropdown, type DropdownOption } from '../../../components/common/Dropdown';
import { FieldErrorText } from '../../../components/common/FieldErrorText';
import type { LaborTypeDto, PartDto } from '../../../types/catalog/catalog.types';
import { VAT_RATE_OPTIONS } from '../../../types/catalog/catalog.types';
import { MAX_QUOTE_LINE_DESCRIPTION_LENGTH } from '../../../types/quotes/quotes.types';
import { formatHuf } from '../../../utils/currency';
import { fieldErrorA11yProps } from '../../../utils/fieldA11y';
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
  referenceChipNeutralWrapButtonClass,
  referenceChipPrimaryWrapButtonClass,
  segmentedControlClass,
  selectWrapperClass,
} from '../../../utils/formStyles';
import {
  applyCatalogSelection,
  computeQuoteLineAmountsPreview,
  NO_QUOTE_LINE_FIELD_ERRORS,
  resolveLineLabelKeys,
  validateQuoteLineForm,
  type QuoteLineFormState,
} from '../helpers';

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

/** VAT choices of the dropdown; values are strings, the form keeps the number. */
const VAT_DROPDOWN_OPTIONS: readonly DropdownOption[] = VAT_RATE_OPTIONS.map((rate) => ({
  value: String(rate),
  label: `${String(rate)}%`,
}));

/** Quote line editor that shows bound field errors once a save was attempted. */
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
  const quantityErrorId = useId();
  const descriptionErrorId = useId();
  const netUnitPriceErrorId = useId();
  // Field errors appear once a save was attempted, then follow the form while it is fixed.
  const [hasSubmitAttempt, setHasSubmitAttempt] = useState(false);
  const errors = hasSubmitAttempt ? validateQuoteLineForm(form) : NO_QUOTE_LINE_FIELD_ERRORS;
  const { quantityKey, unitPriceKey } = resolveLineLabelKeys(form.lineKind);
  const preview = computeQuoteLineAmountsPreview(Number(form.quantity), Number(form.netUnitPrice), form.vatRatePercent);
  const catalogItems = form.lineKind === 'Part'
    ? parts.map((part) => ({ value: String(part.id), label: `${part.partNumber} - ${part.name}` }))
    : laborTypes.map((laborType) => ({ value: String(laborType.id), label: `${laborType.code} - ${laborType.name}` }));
  const catalogOptions = [{ value: '', label: t('quotes.line.catalogNone') }, ...catalogItems];

  return (
    <div data-testid="quote-line-editor" className={`min-w-0 space-y-3 ${insetSurfaceClass} p-3.5`}>
      <div className={`${segmentedControlClass} max-w-xs`}>
        <button
          data-testid="quote-line-kind-part"
          type="button"
          aria-pressed={form.lineKind === 'Part'}
          onClick={() => {
            setForm((previous) => ({ ...previous, lineKind: 'Part', catalogId: '' }));
          }}
          disabled={isSaving}
          className={getSegmentedControlOptionClass(form.lineKind === 'Part')}
        >
          {t('quotes.line.kindPart')}
        </button>
        <button
          data-testid="quote-line-kind-labor"
          type="button"
          aria-pressed={form.lineKind === 'Labor'}
          onClick={() => {
            setForm((previous) => ({ ...previous, lineKind: 'Labor', catalogId: '' }));
          }}
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
          <Dropdown
            data-testid="quote-line-catalog-select"
            id="quote-line-catalog"
            value={form.catalogId}
            options={catalogOptions}
            onChange={(value) => {
              setForm((previous) => applyCatalogSelection(previous, value, parts, laborTypes));
            }}
            disabled={isSaving}
          />
        </div>
      </div>

      <div className={formFieldGroupClass}>
        <label htmlFor="quote-line-description" className={labelClass}>{t('quotes.line.description')}</label>
        <input
          data-testid="quote-line-description-input"
          id="quote-line-description"
          type="text"
          value={form.description}
          onChange={(event) => {
            setForm((previous) => ({ ...previous, description: event.target.value }));
          }}
          className={inputClassCompact}
          placeholder={t('quotes.line.descriptionPlaceholder')}
          maxLength={MAX_QUOTE_LINE_DESCRIPTION_LENGTH}
          disabled={isSaving}
          {...fieldErrorA11yProps(descriptionErrorId, errors.description)}
        />
        <FieldErrorText id={descriptionErrorId} messageKey={errors.description} />
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
            onChange={(event) => {
              setForm((previous) => ({ ...previous, quantity: event.target.value }));
            }}
            className={inputClassCompact}
            disabled={isSaving}
            {...fieldErrorA11yProps(quantityErrorId, errors.quantity)}
          />
          <FieldErrorText id={quantityErrorId} messageKey={errors.quantity} />
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
            onChange={(event) => {
              setForm((previous) => ({ ...previous, netUnitPrice: event.target.value }));
            }}
            className={inputClassCompact}
            disabled={isSaving}
            {...fieldErrorA11yProps(netUnitPriceErrorId, errors.netUnitPrice)}
          />
          <FieldErrorText id={netUnitPriceErrorId} messageKey={errors.netUnitPrice} />
        </div>
      </div>

      <div className={formFieldGridClass}>
        <div className={formFieldGroupClass}>
          <label htmlFor="quote-line-vat" className={labelClass}>{t('common.fields.vatRate')}</label>
          <div className={selectWrapperClass}>
            <Dropdown
              data-testid="quote-line-vat-select"
              id="quote-line-vat"
              value={String(form.vatRatePercent)}
              options={VAT_DROPDOWN_OPTIONS}
              placeholder={t('common.fields.vatRate')}
              onChange={(value) => {
                setForm((previous) => ({ ...previous, vatRatePercent: Number(value) }));
              }}
              disabled={isSaving}
            />
          </div>
        </div>

        <div className={compactDataSurfaceClass}>
          <p className={mutedMetaTextClass}>{t('quotes.line.previewLabel')}</p>
          <p data-testid="quote-line-preview" className={`[overflow-wrap:anywhere] tabular-nums ${compactPrimaryValueTextClass}`}>
            {t('quotes.line.previewValue', {
              net: formatHuf(preview.netAmount, locale),
              gross: formatHuf(preview.grossAmount, locale),
            })}
          </p>
        </div>
      </div>

      <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
        <button type="button" onClick={onCancel} disabled={isSaving} className={referenceChipNeutralWrapButtonClass}>
          <X className={defaultIconClass} />
          <span className="min-w-0 text-center">{t('common.actions.cancel')}</span>
        </button>
        <button
          data-testid="quote-line-save-button"
          type="button"
          onClick={() => {
            setHasSubmitAttempt(true);
            onSubmit();
          }}
          disabled={isSaving}
          aria-busy={isSaving}
          className={referenceChipPrimaryWrapButtonClass}
        >
          <Check className={defaultIconClass} />
          <span className="min-w-0 text-center">{isSaving ? t('common.actions.saving') : t('quotes.line.save')}</span>
        </button>
      </div>
    </div>
  );
});

QuoteLineFormComponent.displayName = 'QuoteLineForm';

export const QuoteLineForm = QuoteLineFormComponent;
