/**
 * Shared part/labor-type list row.
 * Renders name, identifier, net amount, VAT%, and gross amount side by
 * side above `sm`, collapsing to labeled value tiles below it. Fully
 * generic over the caller-supplied labels so the same row serves both the
 * Parts and Labor types tabs.
 * @module pages/Inventory/components/CatalogItemRow
 */
import { memo } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { formatHufUnitPrice } from '../../../utils/currency';
import {
  compactDataSurfaceClass,
  compactItemTitleTextClass,
  compactPrimaryValueTextClass,
  compactTwoColumnGridClass,
  mutedMetaTextClass,
} from '../../../utils/formStyles';

/** Column grid template shared by the row and the tab's header row so both stay aligned. */
export const catalogRowGridClass = 'sm:grid sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(6rem,auto)_minmax(3.5rem,auto)_minmax(6rem,auto)_auto] sm:items-center sm:gap-3';

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

const catalogActionIconClass = 'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-[color,transform] duration-150 ease-out hover:scale-105 motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/40 dark:focus-visible:ring-arsm-focus-ring/30';
const catalogEditActionClass = `${catalogActionIconClass} text-arsm-warning-text hover:text-arsm-warning-accent dark:text-arsm-warning-text-dark dark:hover:text-arsm-warning-text-dark`;
const catalogDeleteActionClass = `${catalogActionIconClass} text-arsm-error-active hover:text-arsm-error-text dark:text-arsm-error-text-light dark:hover:text-arsm-error-text-light`;
const catalogIdentifierTextClass = 'min-w-0 truncate font-mono text-sm text-arsm-label dark:text-arsm-label-dark';
const catalogAmountTextClass = 'min-w-0 truncate text-right tabular-nums text-sm text-arsm-primary dark:text-arsm-primary-dark';
const catalogVatTextClass = 'min-w-0 truncate text-right tabular-nums text-sm text-arsm-label dark:text-arsm-label-dark';

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
      <button type="button" onClick={onEdit} className={catalogEditActionClass} title={editLabel} aria-label={editLabel}>
        <Pencil className="h-3.5 w-3.5 shrink-0" />
      </button>
      <button type="button" onClick={onDelete} className={catalogDeleteActionClass} title={deleteLabel} aria-label={deleteLabel}>
        <Trash2 className="h-3.5 w-3.5 shrink-0" />
      </button>
    </div>
  );

  return (
    <div className="min-w-0 px-3 py-3 sm:px-3.5">
      <div className={`hidden min-w-0 ${catalogRowGridClass}`}>
        <p className={`min-w-0 truncate ${compactItemTitleTextClass}`}>{name}</p>
        <p className={catalogIdentifierTextClass}>{identifier}</p>
        <p className={catalogAmountTextClass}>{formatHufUnitPrice(netAmount, locale)}</p>
        <p className={catalogVatTextClass}>{vatRatePercent}%</p>
        <p className={`${catalogAmountTextClass} font-semibold`}>{formatHufUnitPrice(grossAmount, locale)}</p>
        {actions}
      </div>

      <div className="min-w-0 space-y-2 sm:hidden">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <p className={`min-w-0 truncate ${compactItemTitleTextClass}`}>{name}</p>
          {actions}
        </div>

        <div className={compactTwoColumnGridClass}>
          <div className={compactDataSurfaceClass}>
            <p className={mutedMetaTextClass}>{identifierLabel}</p>
            <p className={`truncate font-mono ${compactPrimaryValueTextClass}`}>{identifier}</p>
          </div>
          <div className={compactDataSurfaceClass}>
            <p className={mutedMetaTextClass}>{netLabel}</p>
            <p className={`truncate text-right tabular-nums ${compactPrimaryValueTextClass}`}>{formatHufUnitPrice(netAmount, locale)}</p>
          </div>
          <div className={compactDataSurfaceClass}>
            <p className={mutedMetaTextClass}>{vatLabel}</p>
            <p className={`truncate text-right tabular-nums ${compactPrimaryValueTextClass}`}>{vatRatePercent}%</p>
          </div>
          <div className={compactDataSurfaceClass}>
            <p className={mutedMetaTextClass}>{grossLabel}</p>
            <p className={`truncate text-right tabular-nums font-semibold ${compactPrimaryValueTextClass}`}>{formatHufUnitPrice(grossAmount, locale)}</p>
          </div>
        </div>
      </div>
    </div>
  );
});

CatalogItemRowComponent.displayName = 'CatalogItemRow';

export const CatalogItemRow = CatalogItemRowComponent;
