/**
 * Shared part/labor-type list row.
 * Renders through `DataListRow` so the header and every row share one
 * column model: name, identifier, net amount, VAT%, and gross amount side
 * by side above the list's own `@3xl` container width, collapsing to
 * labeled value tiles below it. Fully generic over the caller-supplied
 * labels so the same row serves both the Parts and Labor types tabs.
 * @module pages/Inventory/components/CatalogItemRow
 */
import { memo } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { DataListRow } from '../../../components/common/DataList';
import { LabeledValueTile } from '../../../components/common/LabeledValueTile';
import { formatHufUnitPrice } from '../../../utils/currency';
import {
  compactItemTitleTextClass,
  compactTwoColumnGridClass,
  numericMutedValueTextClass,
  numericValueTextClass,
  rowIconActionDangerClass,
  rowIconActionWarningClass,
} from '../../../utils/formStyles';

interface CatalogItemRowProps {
  readonly locale: string;
  readonly name: string;
  readonly identifier: string;
  readonly identifierLabel: string;
  readonly netAmount: number;
  readonly netLabel: string;
  readonly vatRatePercent: number;
  readonly vatLabel: string;
  readonly grossAmount: number;
  readonly grossLabel: string;
  readonly editLabel: string;
  readonly deleteLabel: string;
  readonly onEdit: () => void;
  readonly onDelete: () => void;
}

const catalogIdentifierTextClass = 'min-w-0 truncate font-mono text-sm text-arsm-label dark:text-arsm-label-dark';

const CatalogItemRowComponent = memo(function CatalogItemRow({
  locale,
  name,
  identifier,
  identifierLabel,
  netAmount,
  netLabel,
  vatRatePercent,
  vatLabel,
  grossAmount,
  grossLabel,
  editLabel,
  deleteLabel,
  onEdit,
  onDelete,
}: CatalogItemRowProps) {
  const actions = (
    <div className="flex shrink-0 items-center gap-1">
      <button type="button" onClick={onEdit} className={rowIconActionWarningClass} title={editLabel} aria-label={editLabel}>
        <Pencil className="h-3.5 w-3.5 shrink-0" />
      </button>
      <button type="button" onClick={onDelete} className={rowIconActionDangerClass} title={deleteLabel} aria-label={deleteLabel}>
        <Trash2 className="h-3.5 w-3.5 shrink-0" />
      </button>
    </div>
  );

  return (
    <DataListRow
      breakpoint="3xl"
      testId="catalog-item-row"
      desktop={(
        <>
          <p className={compactItemTitleTextClass}>{name}</p>
          <p className={catalogIdentifierTextClass}>{identifier}</p>
          <p className={numericValueTextClass}>{formatHufUnitPrice(netAmount, locale)}</p>
          <p className={numericMutedValueTextClass}>{vatRatePercent}%</p>
          <p className={`${numericValueTextClass} font-semibold`}>{formatHufUnitPrice(grossAmount, locale)}</p>
          {actions}
        </>
      )}
      mobile={(
        <>
          <div className="flex min-w-0 items-start justify-between gap-2">
            <p className={compactItemTitleTextClass}>{name}</p>
            {actions}
          </div>

          <div className={compactTwoColumnGridClass}>
            <LabeledValueTile label={identifierLabel} value={identifier} valueClassName="font-mono" />
            <LabeledValueTile label={netLabel} value={formatHufUnitPrice(netAmount, locale)} valueClassName="text-right tabular-nums" />
            <LabeledValueTile label={vatLabel} value={`${vatRatePercent}%`} valueClassName="text-right tabular-nums" />
            <LabeledValueTile label={grossLabel} value={formatHufUnitPrice(grossAmount, locale)} valueClassName="text-right tabular-nums font-semibold" />
          </div>
        </>
      )}
    />
  );
});

CatalogItemRowComponent.displayName = 'CatalogItemRow';

export const CatalogItemRow = CatalogItemRowComponent;
