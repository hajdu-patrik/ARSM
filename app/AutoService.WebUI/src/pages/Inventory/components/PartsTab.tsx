/**
 * Parts tab: toolbar (search by name/part number, sort by part number,
 * create) plus the part list.
 * @module pages/Inventory/components/PartsTab
 */
import { memo } from 'react';
import type { TFunction } from 'i18next';
import { ArrowUpDown, Plus, Search, X } from 'lucide-react';
import type { PartDto } from '../../../types/catalog/catalog.types';
import type { CatalogSortDirection } from '../hooks/useCatalogState';
import {
  cardClass,
  contentCardFrameClass,
  inputGroupContainerClass,
  inputGroupIconClass,
  mutedSecondaryTextClass,
  referenceChipNeutralButtonClass,
  referenceChipPrimaryButtonClass,
  searchClearButtonClass,
  searchInputClass,
} from '../../../utils/formStyles';
import { CatalogItemRow, catalogRowGridClass } from './CatalogItemRow';

interface PartsTabProps {
  readonly t: TFunction;
  readonly locale: string;
  readonly parts: PartDto[];
  readonly isLoading: boolean;
  readonly searchTerm: string;
  readonly onSearchChange: (value: string) => void;
  readonly onClearSearch: () => void;
  readonly sortDirection: CatalogSortDirection;
  readonly onToggleSortDirection: () => void;
  readonly onOpenCreateModal: () => void;
  readonly onOpenEditModal: (part: PartDto) => void;
  readonly onOpenDeleteModal: (part: PartDto) => void;
}

const PartsTabComponent = memo(function PartsTab({
  t,
  locale,
  parts,
  isLoading,
  searchTerm,
  onSearchChange,
  onClearSearch,
  sortDirection,
  onToggleSortDirection,
  onOpenCreateModal,
  onOpenEditModal,
  onOpenDeleteModal,
}: PartsTabProps) {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <section className={cardClass}>
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className={`${inputGroupContainerClass} w-full sm:max-w-md`}>
            <Search className={inputGroupIconClass} />
            <input
              data-testid="inventory-parts-search-input"
              type="text"
              value={searchTerm}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={t('inventory.searchPlaceholderParts')}
              className={searchInputClass}
            />
            {searchTerm.length > 0 && (
              <button
                data-testid="inventory-parts-search-clear"
                type="button"
                onClick={onClearSearch}
                title={t('inventory.clearSearch')}
                aria-label={t('inventory.clearSearch')}
                className={searchClearButtonClass}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="flex min-w-0 w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
            <button
              data-testid="inventory-parts-sort-toggle"
              type="button"
              onClick={onToggleSortDirection}
              className={`${referenceChipNeutralButtonClass} flex-1 sm:flex-none`}
            >
              <ArrowUpDown className="h-4 w-4 shrink-0" />
              <span className="truncate">{sortDirection === 'asc' ? t('inventory.sortDirectionAsc') : t('inventory.sortDirectionDesc')}</span>
            </button>

            <button
              data-testid="inventory-parts-create-button"
              type="button"
              onClick={onOpenCreateModal}
              className={`${referenceChipPrimaryButtonClass} flex-1 sm:flex-none`}
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span className="truncate">{t('inventory.createPart')}</span>
            </button>
          </div>
        </div>
      </section>

      <section className={`min-w-0 ${contentCardFrameClass}`}>
        <div className={`hidden ${catalogRowGridClass} border-b border-arsm-border px-3 py-2 text-xs font-medium uppercase tracking-wide text-arsm-muted dark:border-arsm-border-dark dark:text-arsm-muted-dark sm:px-3.5`}>
          <span>{t('inventory.columns.name')}</span>
          <span>{t('inventory.columns.partNumber')}</span>
          <span className="text-right">{t('inventory.columns.netUnitPrice')}</span>
          <span className="text-right">{t('inventory.columns.vatRate')}</span>
          <span className="text-right">{t('inventory.columns.grossUnitPrice')}</span>
          <span aria-hidden="true" />
        </div>

        {isLoading && <p className={`px-3.5 py-6 text-center ${mutedSecondaryTextClass}`}>{t('inventory.loadingParts')}</p>}
        {!isLoading && parts.length === 0 && <p className={`px-3.5 py-6 text-center ${mutedSecondaryTextClass}`}>{t('inventory.emptyParts')}</p>}
        {!isLoading && parts.length > 0 && (
          <div className="min-w-0 divide-y divide-arsm-border/80 dark:divide-arsm-border-dark/80">
            {parts.map((part) => (
              <CatalogItemRow
                key={part.id}
                locale={locale}
                name={part.name}
                identifier={part.partNumber}
                identifierLabel={t('inventory.columns.partNumber')}
                netAmount={part.netUnitPrice}
                netLabel={t('inventory.columns.netUnitPrice')}
                vatRatePercent={part.vatRatePercent}
                vatLabel={t('inventory.columns.vatRate')}
                grossAmount={part.grossUnitPrice}
                grossLabel={t('inventory.columns.grossUnitPrice')}
                editLabel={t('inventory.editPart')}
                deleteLabel={t('inventory.deletePart')}
                onEdit={() => onOpenEditModal(part)}
                onDelete={() => onOpenDeleteModal(part)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
});

PartsTabComponent.displayName = 'PartsTab';

export const PartsTab = PartsTabComponent;
