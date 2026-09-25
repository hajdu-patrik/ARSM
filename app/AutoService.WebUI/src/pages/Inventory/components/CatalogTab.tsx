/**
 * Generic part/labor-type tab: toolbar (search, sort, create) plus the
 * catalog list. Driven by a `CatalogTabConfig` so the Parts and Labor
 * types tabs share one component instead of two near-identical ones.
 * @module pages/Inventory/components/CatalogTab
 */
import type { TFunction } from 'i18next';
import { ArrowUpDown, Plus, Search, X } from 'lucide-react';
import { DataList, type DataListColumn } from '../../../components/common/DataList';
import type { CatalogTabConfig } from '../catalogTab.config';
import type { CatalogSortDirection } from '../hooks/useCatalogState';
import {
  cardClass,
  inputGroupContainerClass,
  inputGroupIconClass,
  referenceChipNeutralButtonClass,
  referenceChipPrimaryButtonClass,
  searchClearButtonClass,
  searchInputClass,
  toolbarActionsWrapperClass,
  toolbarRowLayoutClass,
} from '../../../utils/formStyles';
import { CatalogItemRow } from './CatalogItemRow';

/** Text columns keep an `fr` share with a non-zero floor; numeric/action columns size to the widest cell across all rows and the header, above the same floors the quote lists use. */
const catalogColumnsClass = '@3xl:grid-cols-[minmax(10rem,1.6fr)_minmax(6rem,1fr)_minmax(6.5rem,auto)_minmax(3rem,auto)_minmax(6.5rem,auto)_auto]';

interface CatalogTabProps<TDto> {
  readonly t: TFunction;
  readonly locale: string;
  readonly items: readonly TDto[];
  readonly isLoading: boolean;
  readonly searchTerm: string;
  readonly onSearchChange: (value: string) => void;
  readonly onClearSearch: () => void;
  readonly sortDirection: CatalogSortDirection;
  readonly onToggleSortDirection: () => void;
  readonly onOpenCreateModal: () => void;
  readonly onOpenEditModal: (item: TDto) => void;
  readonly onOpenDeleteModal: (item: TDto) => void;
  readonly config: CatalogTabConfig<TDto>;
}

function CatalogTab<TDto>({
  t,
  locale,
  items,
  isLoading,
  searchTerm,
  onSearchChange,
  onClearSearch,
  sortDirection,
  onToggleSortDirection,
  onOpenCreateModal,
  onOpenEditModal,
  onOpenDeleteModal,
  config,
}: CatalogTabProps<TDto>) {
  const columns: DataListColumn[] = [
    { key: 'name', label: t('inventory.columns.name') },
    { key: 'identifier', label: t(config.identifierColumnKey) },
    { key: 'net', label: t(config.netColumnKey), align: 'right' },
    { key: 'vat', label: t('inventory.columns.vatRate'), align: 'right' },
    { key: 'gross', label: t(config.grossColumnKey), align: 'right' },
    { key: 'actions', label: '' },
  ];

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <section className={cardClass}>
        <div className={toolbarRowLayoutClass}>
          <div className={`${inputGroupContainerClass} w-full sm:max-w-md`}>
            <Search className={inputGroupIconClass} />
            <input
              data-testid={`${config.testIdPrefix}-search-input`}
              type="text"
              value={searchTerm}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={t(config.searchPlaceholderKey)}
              className={searchInputClass}
            />
            {searchTerm.length > 0 && (
              <button
                data-testid={`${config.testIdPrefix}-search-clear`}
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

          <div className={toolbarActionsWrapperClass}>
            <button
              data-testid={`${config.testIdPrefix}-sort-toggle`}
              type="button"
              onClick={onToggleSortDirection}
              className={`${referenceChipNeutralButtonClass} flex-1 sm:flex-none`}
            >
              <ArrowUpDown className="h-4 w-4 shrink-0" />
              <span className="truncate">{sortDirection === 'asc' ? t('inventory.sortDirectionAsc') : t('inventory.sortDirectionDesc')}</span>
            </button>

            <button
              data-testid={`${config.testIdPrefix}-create-button`}
              type="button"
              onClick={onOpenCreateModal}
              className={`${referenceChipPrimaryButtonClass} flex-1 sm:flex-none`}
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span className="truncate">{t(config.createLabelKey)}</span>
            </button>
          </div>
        </div>
      </section>

      <DataList
        breakpoint="3xl"
        columnsClassName={catalogColumnsClass}
        columns={columns}
        isLoading={isLoading}
        loadingText={t(config.loadingKey)}
        isEmpty={items.length === 0}
        emptyText={t(config.emptyKey)}
      >
        {items.map((item) => (
          <CatalogItemRow
            key={config.getId(item)}
            locale={locale}
            name={config.getName(item)}
            identifier={config.getIdentifier(item)}
            identifierLabel={t(config.identifierColumnKey)}
            netAmount={config.getNet(item)}
            netLabel={t(config.netColumnKey)}
            vatRatePercent={config.getVat(item)}
            vatLabel={t('inventory.columns.vatRate')}
            grossAmount={config.getGross(item)}
            grossLabel={t(config.grossColumnKey)}
            editLabel={t(config.editLabelKey)}
            deleteLabel={t(config.deleteLabelKey)}
            onEdit={() => onOpenEditModal(item)}
            onDelete={() => onOpenDeleteModal(item)}
          />
        ))}
      </DataList>
    </div>
  );
}

CatalogTab.displayName = 'CatalogTab';

export { CatalogTab };
