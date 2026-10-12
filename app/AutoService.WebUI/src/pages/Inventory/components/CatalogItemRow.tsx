/** Shared part/labor-type list row: renders through `DataListRow`, generic over caller-supplied labels for both tabs. */
import { memo } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { HighlightedText } from '../../../components/common/HighlightedText';
import { DataListCell, DataListRow, DataListText } from '../../../components/common/DataList';
import { formatHufUnitPrice } from '../../../utils/currency';
import {
  compactRowActionsClusterClass,
  compactTwoColumnFixedGridClass,
  rowIconActionDangerClass,
  rowIconActionWarningClass,
  smallIconClass,
} from '../../../utils/formStyles';
import { formatQuantity } from '../../../utils/number';

interface CatalogItemRowProps {
  readonly locale: string;
  readonly name: string;
  readonly identifier: string;
  readonly searchQuery: string;
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

interface CatalogRowActionsProps {
  readonly editLabel: string;
  readonly deleteLabel: string;
  readonly onEdit: () => void;
  readonly onDelete: () => void;
}

/** Edit and delete icon actions of one catalog row. */
function CatalogRowActions({ editLabel, deleteLabel, onEdit, onDelete }: CatalogRowActionsProps) {
  return (
    <div className={compactRowActionsClusterClass}>
      <button type="button" onClick={onEdit} className={rowIconActionWarningClass} title={editLabel} aria-label={editLabel}>
        <Pencil className={smallIconClass} />
      </button>
      <button type="button" onClick={onDelete} className={rowIconActionDangerClass} title={deleteLabel} aria-label={deleteLabel}>
        <Trash2 className={smallIconClass} />
      </button>
    </div>
  );
}

const CatalogItemRowComponent = memo(function CatalogItemRow({
  locale,
  name,
  identifier,
  searchQuery,
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
  const netText = formatHufUnitPrice(netAmount, locale);
  const vatText = `${formatQuantity(vatRatePercent, locale)}%`;
  const grossText = formatHufUnitPrice(grossAmount, locale);

  return (
    <DataListRow
      testId="catalog-item-row"
      valuesClassName={compactTwoColumnFixedGridClass}
      lead={(
        <DataListCell column="name">
          <DataListText kind="title" title={name}><HighlightedText text={name} query={searchQuery} /></DataListText>
        </DataListCell>
      )}
      actions={(
        <DataListCell column="actions" headerEnd>
          <CatalogRowActions editLabel={editLabel} deleteLabel={deleteLabel} onEdit={onEdit} onDelete={onDelete} />
        </DataListCell>
      )}
    >
      <DataListCell column="identifier" label={identifierLabel} tile>
        <DataListText kind="identifier" title={identifier}><HighlightedText text={identifier} query={searchQuery} /></DataListText>
      </DataListCell>
      <DataListCell column="net" label={netLabel} tile>
        <DataListText kind="amount" title={netText}>{netText}</DataListText>
      </DataListCell>
      <DataListCell column="vat" label={vatLabel} tile>
        <DataListText kind="quantity" title={vatText}>{vatText}</DataListText>
      </DataListCell>
      <DataListCell column="gross" label={grossLabel} tile>
        <DataListText kind="amount" title={grossText} className="font-semibold">{grossText}</DataListText>
      </DataListCell>
    </DataListRow>
  );
});

CatalogItemRowComponent.displayName = 'CatalogItemRow';

export const CatalogItemRow = CatalogItemRowComponent;
