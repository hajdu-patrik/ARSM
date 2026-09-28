/** Shared part/labor-type list row: renders through `DataListRow`, generic over caller-supplied labels for both tabs. */
import { memo } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { DataListRow } from '../../../components/common/DataList';
import { LabeledValueTile } from '../../../components/common/LabeledValueTile';
import { formatHufUnitPrice } from '../../../utils/currency';
import {
  compactItemTitleTextClass,
  compactRowActionsClusterClass,
  compactRowHeaderClass,
  compactTwoColumnGridClass,
  monoIdentifierTextClass,
  numericMutedValueTextClass,
  numericValueTextClass,
  rowIconActionDangerClass,
  rowIconActionWarningClass,
  smallIconClass,
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
    <div className={compactRowActionsClusterClass}>
      <button type="button" onClick={onEdit} className={rowIconActionWarningClass} title={editLabel} aria-label={editLabel}>
        <Pencil className={smallIconClass} />
      </button>
      <button type="button" onClick={onDelete} className={rowIconActionDangerClass} title={deleteLabel} aria-label={deleteLabel}>
        <Trash2 className={smallIconClass} />
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
          <p className={monoIdentifierTextClass}>{identifier}</p>
          <p className={numericValueTextClass}>{formatHufUnitPrice(netAmount, locale)}</p>
          <p className={numericMutedValueTextClass}>{vatRatePercent}%</p>
          <p className={`${numericValueTextClass} font-semibold`}>{formatHufUnitPrice(grossAmount, locale)}</p>
          {actions}
        </>
      )}
      mobile={(
        <>
          <div className={compactRowHeaderClass}>
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
