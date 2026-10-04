/** Saved quote line row via DataListRow (shared column model, `@3xl` tile collapse); actions only while editable, amounts always from the server DTO. */
import { memo } from 'react';
import type { TFunction } from 'i18next';
import { Pencil, Trash2 } from 'lucide-react';
import { DataListRow } from '../../../components/common/DataList';
import { LabeledValueTile } from '../../../components/common/LabeledValueTile';
import type { QuoteLineDto } from '../../../types/quotes/quotes.types';
import { formatHuf, formatHufUnitPrice } from '../../../utils/currency';
import {
  compactItemTitleClampTextClass,
  compactItemTitleTextClass,
  compactRowActionsClusterClass,
  compactRowHeaderClass,
  compactTwoColumnGridClass,
  metadataPillClass,
  metadataPillWrapClass,
  numericMutedValueTextClass,
  numericValueTextClass,
  rowIconActionDangerClass,
  rowIconActionWarningClass,
  smallIconClass,
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
  const quantityText = formatQuantity(line.quantity, locale);
  const unitPriceText = formatHufUnitPrice(line.netUnitPrice, locale);
  const vatText = `${line.vatRatePercent}%`;
  const netText = formatHuf(line.netAmount, locale);
  const grossText = formatHuf(line.grossAmount, locale);

  const actions = (
    <div className={compactRowActionsClusterClass}>
      <button
        data-testid="quote-line-edit-button"
        type="button"
        onClick={onStartEdit}
        disabled={isSaving}
        className={rowIconActionWarningClass}
        title={t('quotes.line.edit')}
        aria-label={t('quotes.line.edit')}
      >
        <Pencil className={smallIconClass} />
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
        <Trash2 className={smallIconClass} />
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
            <p className={compactItemTitleTextClass} title={line.description}>{line.description}</p>
            <p className={`mt-1 ${metadataPillClass}`} title={kindLabel}>{kindLabel}</p>
          </div>
          <p className={numericMutedValueTextClass} title={quantityText}>{quantityText}</p>
          <p className={numericMutedValueTextClass} title={unitPriceText}>{unitPriceText}</p>
          <p className={numericMutedValueTextClass} title={vatText}>{vatText}</p>
          <p className={numericValueTextClass} title={netText}>{netText}</p>
          <p className={`${numericValueTextClass} font-semibold`} title={grossText}>{grossText}</p>
          {canEdit && actions}
        </>
      )}
      mobile={(
        <>
          <div className={compactRowHeaderClass}>
            <div className="min-w-0">
              <p className={compactItemTitleClampTextClass}>{line.description}</p>
              <p className={`mt-1 ${metadataPillWrapClass}`}>{kindLabel}</p>
            </div>
            {canEdit && actions}
          </div>

          <div className={compactTwoColumnGridClass}>
            <LabeledValueTile label={t(quantityKey)} value={quantityText} valueClassName="text-right tabular-nums" />
            <LabeledValueTile label={t(unitPriceKey)} value={unitPriceText} valueClassName="text-right tabular-nums" />
            <LabeledValueTile label={t('common.fields.vatRate')} value={vatText} valueClassName="text-right tabular-nums" />
            <LabeledValueTile label={t('common.fields.net')} value={netText} valueClassName="text-right tabular-nums" />
            <LabeledValueTile label={t('common.fields.gross')} value={grossText} valueClassName="text-right font-semibold tabular-nums" />
          </div>
        </>
      )}
    />
  );
});

QuoteLineRowComponent.displayName = 'QuoteLineRow';

export const QuoteLineRow = QuoteLineRowComponent;
