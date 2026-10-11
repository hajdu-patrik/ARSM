/** Saved quote line row via DataListRow (one DOM, `@3xl` table or tiles); actions only while editable, amounts always from the server DTO. */
import { memo } from 'react';
import type { TFunction } from 'i18next';
import { Pencil, Trash2 } from 'lucide-react';
import { DataListCell, DataListRow, DataListText } from '../../../components/common/DataList';
import type { QuoteLineDto } from '../../../types/quotes/quotes.types';
import { formatHuf, formatHufUnitPrice } from '../../../utils/currency';
import {
  compactRowActionsClusterClass,
  compactTwoColumnGridClass,
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

interface QuoteLineActionsProps {
  readonly t: TFunction;
  readonly isSaving: boolean;
  readonly onStartEdit: () => void;
  readonly onDelete: () => void;
}

/** Edit and delete icon actions of one saved line. */
function QuoteLineActions({ t, isSaving, onStartEdit, onDelete }: QuoteLineActionsProps) {
  return (
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
  const vatText = `${formatQuantity(line.vatRatePercent, locale)}%`;
  const netText = formatHuf(line.netAmount, locale);
  const grossText = formatHuf(line.grossAmount, locale);

  return (
    <DataListRow
      testId="quote-line-row"
      valuesClassName={compactTwoColumnGridClass}
      lead={(
        <DataListCell column="description">
          <DataListText kind="title" title={line.description}>{line.description}</DataListText>
          <DataListText kind="pill" title={kindLabel} className="mt-1">{kindLabel}</DataListText>
        </DataListCell>
      )}
      actions={canEdit ? (
        <DataListCell column="actions" headerEnd>
          <QuoteLineActions t={t} isSaving={isSaving} onStartEdit={onStartEdit} onDelete={onDelete} />
        </DataListCell>
      ) : null}
    >
      <DataListCell column="quantity" label={t(quantityKey)} tile>
        <DataListText kind="quantity" title={quantityText}>{quantityText}</DataListText>
      </DataListCell>
      <DataListCell column="unitPrice" label={t(unitPriceKey)} tile>
        <DataListText kind="quantity" title={unitPriceText}>{unitPriceText}</DataListText>
      </DataListCell>
      <DataListCell column="vat" label={t('common.fields.vatRate')} tile>
        <DataListText kind="quantity" title={vatText}>{vatText}</DataListText>
      </DataListCell>
      <DataListCell column="net" label={t('common.fields.net')} tile>
        <DataListText kind="amount" title={netText}>{netText}</DataListText>
      </DataListCell>
      <DataListCell column="gross" label={t('common.fields.gross')} tile>
        <DataListText kind="amount" title={grossText} className="font-semibold">{grossText}</DataListText>
      </DataListCell>
    </DataListRow>
  );
});

QuoteLineRowComponent.displayName = 'QuoteLineRow';

export const QuoteLineRow = QuoteLineRowComponent;
