/**
 * Labor types tab: toolbar (search by name/code, sort by code, create)
 * plus the labor type list.
 * @module pages/Inventory/components/LaborTypesTab
 */
import { memo } from 'react';
import type { TFunction } from 'i18next';
import { ArrowUpDown, Plus, Search, X } from 'lucide-react';
import type { LaborTypeDto } from '../../../types/catalog/catalog.types';
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

interface LaborTypesTabProps {
  readonly t: TFunction;
  readonly locale: string;
  readonly laborTypes: LaborTypeDto[];
  readonly isLoading: boolean;
  readonly searchTerm: string;
  readonly onSearchChange: (value: string) => void;
  readonly onClearSearch: () => void;
  readonly sortDirection: CatalogSortDirection;
  readonly onToggleSortDirection: () => void;
  readonly onOpenCreateModal: () => void;
  readonly onOpenEditModal: (laborType: LaborTypeDto) => void;
  readonly onOpenDeleteModal: (laborType: LaborTypeDto) => void;
}

const LaborTypesTabComponent = memo(function LaborTypesTab({
  t,
  locale,
  laborTypes,
  isLoading,
  searchTerm,
  onSearchChange,
  onClearSearch,
  sortDirection,
  onToggleSortDirection,
  onOpenCreateModal,
  onOpenEditModal,
  onOpenDeleteModal,
}: LaborTypesTabProps) {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <section className={cardClass}>
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className={`${inputGroupContainerClass} w-full sm:max-w-md`}>
            <Search className={inputGroupIconClass} />
            <input
              data-testid="inventory-labor-types-search-input"
              type="text"
              value={searchTerm}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={t('inventory.searchPlaceholderLaborTypes')}
              className={searchInputClass}
            />
            {searchTerm.length > 0 && (
              <button
                data-testid="inventory-labor-types-search-clear"
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
              data-testid="inventory-labor-types-sort-toggle"
              type="button"
              onClick={onToggleSortDirection}
              className={`${referenceChipNeutralButtonClass} flex-1 sm:flex-none`}
            >
              <ArrowUpDown className="h-4 w-4 shrink-0" />
              <span className="truncate">{sortDirection === 'asc' ? t('inventory.sortDirectionAsc') : t('inventory.sortDirectionDesc')}</span>
            </button>

            <button
              data-testid="inventory-labor-types-create-button"
              type="button"
              onClick={onOpenCreateModal}
              className={`${referenceChipPrimaryButtonClass} flex-1 sm:flex-none`}
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span className="truncate">{t('inventory.createLaborType')}</span>
            </button>
          </div>
        </div>
      </section>

      <section className={`min-w-0 ${contentCardFrameClass}`}>
        <div className={`hidden ${catalogRowGridClass} border-b border-arsm-border px-3 py-2 text-xs font-medium uppercase tracking-wide text-arsm-muted dark:border-arsm-border-dark dark:text-arsm-muted-dark sm:px-3.5`}>
          <span>{t('inventory.columns.name')}</span>
          <span>{t('inventory.columns.code')}</span>
          <span className="text-right">{t('inventory.columns.hourlyNetRate')}</span>
          <span className="text-right">{t('inventory.columns.vatRate')}</span>
          <span className="text-right">{t('inventory.columns.grossHourlyRate')}</span>
          <span aria-hidden="true" />
        </div>

        {isLoading && <p className={`px-3.5 py-6 text-center ${mutedSecondaryTextClass}`}>{t('inventory.loadingLaborTypes')}</p>}
        {!isLoading && laborTypes.length === 0 && <p className={`px-3.5 py-6 text-center ${mutedSecondaryTextClass}`}>{t('inventory.emptyLaborTypes')}</p>}
        {!isLoading && laborTypes.length > 0 && (
          <div className="min-w-0 divide-y divide-arsm-border/80 dark:divide-arsm-border-dark/80">
            {laborTypes.map((laborType) => (
              <CatalogItemRow
                key={laborType.id}
                locale={locale}
                name={laborType.name}
                identifier={laborType.code}
                identifierLabel={t('inventory.columns.code')}
                netAmount={laborType.hourlyNetRate}
                netLabel={t('inventory.columns.hourlyNetRate')}
                vatRatePercent={laborType.vatRatePercent}
                vatLabel={t('inventory.columns.vatRate')}
                grossAmount={laborType.grossHourlyRate}
                grossLabel={t('inventory.columns.grossHourlyRate')}
                editLabel={t('inventory.editLaborType')}
                deleteLabel={t('inventory.deleteLaborType')}
                onEdit={() => onOpenEditModal(laborType)}
                onDelete={() => onOpenDeleteModal(laborType)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
});

LaborTypesTabComponent.displayName = 'LaborTypesTab';

export const LaborTypesTab = LaborTypesTabComponent;
