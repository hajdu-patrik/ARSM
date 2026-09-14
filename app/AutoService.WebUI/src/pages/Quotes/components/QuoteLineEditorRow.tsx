/**
 * One quote line, either as a saved row or as the inline editor for it.
 *
 * The same component serves part and labor lines; only the labels change,
 * because what the PDF prints as "hourly rate" has to read as an hourly rate
 * here too. Saved amounts always come from the server DTO; while typing, the
 * row shows a preview computed with the server's own formula.
 * @module pages/Quotes/components/QuoteLineEditorRow
 */
import { memo, type Dispatch, type SetStateAction } from 'react';
import type { TFunction } from 'i18next';
import { Check, Pencil, Trash2, X } from 'lucide-react';
import type { LaborTypeDto, PartDto } from '../../../types/catalog/catalog.types';
import { VAT_RATE_OPTIONS } from '../../../types/catalog/catalog.types';
import {
  MAX_QUOTE_LINE_DESCRIPTION_LENGTH,
  type QuoteLineDto,
  type QuoteLineKind,
} from '../../../types/quotes/quotes.types';
import { formatHuf, formatHufUnitPrice } from '../../../utils/currency';
import {
  compactDataSurfaceClass,
  compactItemTitleTextClass,
  compactPrimaryValueTextClass,
  compactTwoColumnGridClass,
  formFieldGridClass,
  formFieldGroupClass,
  getSegmentedControlOptionClass,
  inputClassCompact,
  insetSurfaceClass,
  labelClass,
  metadataPillClass,
  mutedMetaTextClass,
  referenceChipNeutralButtonClass,
  referenceChipPrimaryButtonClass,
  segmentedControlClass,
  selectWrapperClass,
} from '../../../utils/formStyles';
import { computeQuoteLineAmountsPreview, type QuoteLineFormState } from '../helpers';

/** Column grid template shared by the line rows and the lines-section header. */
export const quoteLineRowGridClass = 'md:grid md:grid-cols-[minmax(0,1.8fr)_minmax(3.5rem,auto)_minmax(6.5rem,auto)_minmax(3rem,auto)_minmax(6.5rem,auto)_minmax(6.5rem,auto)_auto] md:items-center md:gap-3';

interface QuoteLineEditorRowProps {
  readonly t: TFunction;
  readonly locale: string;
  readonly line: QuoteLineDto | null;
  readonly isEditing: boolean;
  readonly isSaving: boolean;
  readonly canEdit: boolean;
  readonly form: QuoteLineFormState;
  readonly setForm: Dispatch<SetStateAction<QuoteLineFormState>>;
  readonly parts: PartDto[];
  readonly laborTypes: LaborTypeDto[];
  readonly onStartEdit: () => void;
  readonly onDelete: () => void;
  readonly onSubmit: () => void;
  readonly onCancel: () => void;
}

const lineActionIconClass = 'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-[color,transform] duration-150 ease-out hover:scale-105 motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/40 disabled:cursor-not-allowed disabled:opacity-60 dark:focus-visible:ring-arsm-focus-ring/30';
const lineEditActionClass = `${lineActionIconClass} text-arsm-warning-text hover:text-arsm-warning-accent dark:text-arsm-warning-text-dark dark:hover:text-arsm-warning-text-dark`;
const lineDeleteActionClass = `${lineActionIconClass} text-arsm-error-active hover:text-arsm-error-text dark:text-arsm-error-text-light dark:hover:text-arsm-error-text-light`;
const lineValueTextClass = 'min-w-0 truncate text-right text-sm tabular-nums text-arsm-primary dark:text-arsm-primary-dark';
const lineMutedValueTextClass = 'min-w-0 truncate text-right text-sm tabular-nums text-arsm-label dark:text-arsm-label-dark';

/**
 * Picks the label set for a line kind: a part is counted in pieces at a unit
 * price, labor in hours at an hourly rate (requirement 4).
 * @param lineKind Kind of the line being rendered.
 * @returns i18n keys for the quantity and unit-price labels.
 */
function resolveLineLabelKeys(lineKind: QuoteLineKind): { quantityKey: string; unitPriceKey: string } {
  return lineKind === 'Labor'
    ? { quantityKey: 'quotes.line.hours', unitPriceKey: 'quotes.line.hourlyNetRate' }
    : { quantityKey: 'quotes.line.quantity', unitPriceKey: 'quotes.line.netUnitPrice' };
}

/**
 * Applies a catalog selection to the line form, pre-filling the snapshot
 * fields while leaving them editable, so an override still wins server-side.
 * @param form Current line form state.
 * @param catalogId Selected catalog entry id, or an empty string for a manual line.
 * @param parts Part catalog entries.
 * @param laborTypes Labor type catalog entries.
 * @returns The next line form state.
 */
function applyCatalogSelection(
  form: QuoteLineFormState,
  catalogId: string,
  parts: PartDto[],
  laborTypes: LaborTypeDto[],
): QuoteLineFormState {
  if (catalogId.length === 0) {
    return { ...form, catalogId };
  }

  const numericId = Number(catalogId);

  if (form.lineKind === 'Part') {
    const part = parts.find((candidate) => candidate.id === numericId);
    return part
      ? {
        ...form,
        catalogId,
        description: part.name,
        netUnitPrice: String(part.netUnitPrice),
        vatRatePercent: part.vatRatePercent,
      }
      : { ...form, catalogId };
  }

  const laborType = laborTypes.find((candidate) => candidate.id === numericId);
  return laborType
    ? {
      ...form,
      catalogId,
      description: laborType.name,
      netUnitPrice: String(laborType.hourlyNetRate),
      vatRatePercent: laborType.vatRatePercent,
    }
    : { ...form, catalogId };
}

const QuoteLineEditorRowComponent = memo(function QuoteLineEditorRow({
  t,
  locale,
  line,
  isEditing,
  isSaving,
  canEdit,
  form,
  setForm,
  parts,
  laborTypes,
  onStartEdit,
  onDelete,
  onSubmit,
  onCancel,
}: QuoteLineEditorRowProps) {
  if (isEditing) {
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
            {form.lineKind === 'Part' ? t('quotes.line.partCatalog') : t('quotes.line.laborCatalog')}
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
            <label htmlFor="quote-line-vat" className={labelClass}>{t('quotes.line.vatRate')}</label>
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
            <X className="h-4 w-4 shrink-0" />
            <span className="truncate">{t('quotes.line.cancel')}</span>
          </button>
          <button
            data-testid="quote-line-save-button"
            type="button"
            onClick={onSubmit}
            disabled={isSaving}
            aria-busy={isSaving}
            className={referenceChipPrimaryButtonClass}
          >
            <Check className="h-4 w-4 shrink-0" />
            <span className="truncate">{isSaving ? t('quotes.saving') : t('quotes.line.save')}</span>
          </button>
        </div>
      </div>
    );
  }

  if (!line) {
    return null;
  }

  const { quantityKey, unitPriceKey } = resolveLineLabelKeys(line.lineKind);
  const kindLabel = line.lineKind === 'Labor' ? t('quotes.line.kindLabor') : t('quotes.line.kindPart');

  const actions = canEdit
    ? (
      <div className="flex shrink-0 items-center gap-1">
        <button
          data-testid="quote-line-edit-button"
          type="button"
          onClick={onStartEdit}
          disabled={isSaving}
          className={lineEditActionClass}
          title={t('quotes.line.edit')}
          aria-label={t('quotes.line.edit')}
        >
          <Pencil className="h-3.5 w-3.5 shrink-0" />
        </button>
        <button
          data-testid="quote-line-delete-button"
          type="button"
          onClick={onDelete}
          disabled={isSaving}
          className={lineDeleteActionClass}
          title={t('quotes.line.delete')}
          aria-label={t('quotes.line.delete')}
        >
          <Trash2 className="h-3.5 w-3.5 shrink-0" />
        </button>
      </div>
    )
    : null;

  return (
    <div data-testid="quote-line-row" className="min-w-0 px-3 py-3 sm:px-3.5">
      <div className={`hidden min-w-0 ${quoteLineRowGridClass}`}>
        <div className="min-w-0">
          <p className={compactItemTitleTextClass}>{line.description}</p>
          <p className={`mt-1 ${metadataPillClass}`}>{kindLabel}</p>
        </div>
        <p className={lineMutedValueTextClass}>{line.quantity}</p>
        <p className={lineMutedValueTextClass}>{formatHufUnitPrice(line.netUnitPrice, locale)}</p>
        <p className={lineMutedValueTextClass}>{line.vatRatePercent}%</p>
        <p className={lineValueTextClass}>{formatHuf(line.netAmount, locale)}</p>
        <p className={`${lineValueTextClass} font-semibold`}>{formatHuf(line.grossAmount, locale)}</p>
        {actions ?? <span aria-hidden="true" />}
      </div>

      <div className="min-w-0 space-y-2 md:hidden">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="min-w-0">
            <p className={compactItemTitleTextClass}>{line.description}</p>
            <p className={`mt-1 ${metadataPillClass}`}>{kindLabel}</p>
          </div>
          {actions}
        </div>

        <div className={compactTwoColumnGridClass}>
          <div className={compactDataSurfaceClass}>
            <p className={mutedMetaTextClass}>{t(quantityKey)}</p>
            <p className={`truncate text-right tabular-nums ${compactPrimaryValueTextClass}`}>{line.quantity}</p>
          </div>
          <div className={compactDataSurfaceClass}>
            <p className={mutedMetaTextClass}>{t(unitPriceKey)}</p>
            <p className={`truncate text-right tabular-nums ${compactPrimaryValueTextClass}`}>{formatHufUnitPrice(line.netUnitPrice, locale)}</p>
          </div>
          <div className={compactDataSurfaceClass}>
            <p className={mutedMetaTextClass}>{t('quotes.line.vatRate')}</p>
            <p className={`truncate text-right tabular-nums ${compactPrimaryValueTextClass}`}>{line.vatRatePercent}%</p>
          </div>
          <div className={compactDataSurfaceClass}>
            <p className={mutedMetaTextClass}>{t('quotes.line.netAmount')}</p>
            <p className={`truncate text-right tabular-nums ${compactPrimaryValueTextClass}`}>{formatHuf(line.netAmount, locale)}</p>
          </div>
          <div className={compactDataSurfaceClass}>
            <p className={mutedMetaTextClass}>{t('quotes.line.grossAmount')}</p>
            <p className={`truncate text-right font-semibold tabular-nums ${compactPrimaryValueTextClass}`}>{formatHuf(line.grossAmount, locale)}</p>
          </div>
        </div>
      </div>
    </div>
  );
});

QuoteLineEditorRowComponent.displayName = 'QuoteLineEditorRow';

export const QuoteLineEditorRow = QuoteLineEditorRowComponent;
