/**
 * Saved quote line row.
 *
 * Renders through `DataListRow` so the header and every row share one column
 * model: description/kind, quantity, unit price, VAT percent, and the net
 * and gross amounts side by side above the list's own `@3xl` container
 * width, collapsing to labeled value tiles below it. The actions cell is
 * present only while the quote can still be edited. Every amount comes from
 * the server DTO; the row never computes one.
 * @module pages/Quotes/components/QuoteLineRow
 */
import { memo } from 'react';
import type { TFunction } from 'i18next';
import { Pencil, Trash2 } from 'lucide-react';
import { DataListRow } from '../../../components/common/DataList';
import { LabeledValueTile } from '../../../components/common/LabeledValueTile';
import type { QuoteLineDto } from '../../../types/quotes/quotes.types';
import { formatHuf, formatHufUnitPrice } from '../../../utils/currency';
import {
  compactItemTitleTextClass,
  compactTwoColumnGridClass,
  metadataPillClass,
  numericMutedValueTextClass,
  numericValueTextClass,
  rowIconActionDangerClass,
  rowIconActionWarningClass,
} from '../../../utils/formStyles';
import { formatQuantity } from '../../../utils/number';
import { resolveLineLabelKeys } from '../helpers';

interface QuoteLineRowProps {
  readonly t: TFunction;
  readonly locale: string;
  readonly line: QuoteLineDto;
  readonly canEdit: boolean;
  readonly isSaving: boolean;
  readonly onStartEdit: () => void;
  readonly onDelete: () => void;
}

const QuoteLineRowComponent = memo(function QuoteLineRow({
  t,
  locale,
  line,
  canEdit,
  isSaving,
  onStartEdit,
  onDelete,
}: QuoteLineRowProps) {
  const { quantityKey, unitPriceKey } = resolveLineLabelKeys(line.lineKind);
  const kindLabel = line.lineKind === 'Labor' ? t('quotes.line.kindLabor') : t('quotes.line.kindPart');

  const actions = (
    <div className="flex shrink-0 items-center gap-1">
      <button
        data-testid="quote-line-edit-button"
        type="button"
        onClick={onStartEdit}
        disabled={isSaving}
        className={rowIconActionWarningClass}
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
        className={rowIconActionDangerClass}
        title={t('quotes.line.delete')}
        aria-label={t('quotes.line.delete')}
      >
        <Trash2 className="h-3.5 w-3.5 shrink-0" />
      </button>
    </div>
  );

  return (
    <DataListRow
      breakpoint="3xl"
      testId="quote-line-row"
      desktop={(
        <>
          <div className="min-w-0">
            <p className={compactItemTitleTextClass}>{line.description}</p>
            <p className={`mt-1 ${metadataPillClass}`}>{kindLabel}</p>
          </div>
          <p className={numericMutedValueTextClass}>{formatQuantity(line.quantity, locale)}</p>
          <p className={numericMutedValueTextClass}>{formatHufUnitPrice(line.netUnitPrice, locale)}</p>
          <p className={numericMutedValueTextClass}>{line.vatRatePercent}%</p>
          <p className={numericValueTextClass}>{formatHuf(line.netAmount, locale)}</p>
          <p className={`${numericValueTextClass} font-semibold`}>{formatHuf(line.grossAmount, locale)}</p>
          {canEdit && actions}
        </>
      )}
      mobile={(
        <>
          <div className="flex min-w-0 items-start justify-between gap-2">
            <div className="min-w-0">
              <p className={compactItemTitleTextClass}>{line.description}</p>
              <p className={`mt-1 ${metadataPillClass}`}>{kindLabel}</p>
            </div>
            {canEdit && actions}
          </div>

          <div className={compactTwoColumnGridClass}>
            <LabeledValueTile label={t(quantityKey)} value={formatQuantity(line.quantity, locale)} valueClassName="text-right tabular-nums" />
            <LabeledValueTile label={t(unitPriceKey)} value={formatHufUnitPrice(line.netUnitPrice, locale)} valueClassName="text-right tabular-nums" />
            <LabeledValueTile label={t('quotes.line.vatRate')} value={`${line.vatRatePercent}%`} valueClassName="text-right tabular-nums" />
            <LabeledValueTile label={t('quotes.line.netAmount')} value={formatHuf(line.netAmount, locale)} valueClassName="text-right tabular-nums" />
            <LabeledValueTile label={t('quotes.line.grossAmount')} value={formatHuf(line.grossAmount, locale)} valueClassName="text-right font-semibold tabular-nums" />
          </div>
        </>
      )}
    />
  );
});

QuoteLineRowComponent.displayName = 'QuoteLineRow';

export const QuoteLineRow = QuoteLineRowComponent;
