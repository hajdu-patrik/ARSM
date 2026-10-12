/** Generic part/labor-type tab (toolbar plus list) driven by a `CatalogTabConfig`, shared by Parts and Labor types. */
import type { RefObject } from 'react';
import type { TFunction } from 'i18next';
import { Plus, Search, X } from 'lucide-react';
import { DataList, type DataListColumn } from '../../../components/common/DataList';
import { Pagination } from '../../../components/common/Pagination';
import type { CatalogTabConfig } from '../catalogTab.config';
import type { CatalogEntityListState } from '../hooks/useCatalogState';
import {
  cardClass,
  defaultIconClass,
  inputGroupContainerClass,
  inputGroupIconClass,
  referenceChipPrimaryButtonClass,
  searchClearButtonClass,
  searchInputClass,
  toolbarActionGrowClass,
  toolbarActionsWrapperClass,
  toolbarRowLayoutClass,
  toolbarSearchFieldClass,
} from '../../../utils/formStyles';
import { CatalogItemRow } from './CatalogItemRow';

/** Text columns keep an `fr` share with a non-zero floor; numeric/action columns size to the widest cell across all rows and the header, above the same floors the quote lists use. */
const catalogColumnsClass = '@3xl:grid-cols-[minmax(10rem,1.6fr)_minmax(6rem,1fr)_minmax(6.5rem,auto)_minmax(3rem,auto)_minmax(6.5rem,auto)_auto]';

interface CatalogTabProps<TDto> {
  readonly t: TFunction;
  readonly locale: string;
  readonly list: CatalogEntityListState<TDto>;
  readonly listRef: RefObject<HTMLDivElement | null>;
  readonly onOpenCreateModal: () => void;
  readonly onOpenEditModal: (item: TDto) => void;
  readonly onOpenDeleteModal: (item: TDto) => void;
  readonly config: CatalogTabConfig<TDto>;
}

function CatalogTab<TDto>({
  t,
  locale,
  list,
  listRef,
  onOpenCreateModal,
  onOpenEditModal,
  onOpenDeleteModal,
  config,
}: CatalogTabProps<TDto>) {
  const columns: DataListColumn[] = [
    { key: 'name', label: t('inventory.name') },
    { key: 'identifier', label: t(config.identifierColumnKey) },
    { key: 'net', label: t(config.netColumnKey), align: 'right' },
    { key: 'vat', label: t('common.fields.vat'), align: 'right' },
    { key: 'gross', label: t(config.grossColumnKey), align: 'right' },
    { key: 'actions', label: '' },
  ];
  const { searchTerm } = list;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <section className={cardClass}>
        <div className={toolbarRowLayoutClass}>
          <div className={`${inputGroupContainerClass} ${toolbarSearchFieldClass}`}>
            <Search className={inputGroupIconClass} />
            <input
              data-testid={`${config.testIdPrefix}-search-input`}
              type="text"
              value={searchTerm}
              onChange={(event) => { list.setSearchTerm(event.target.value); }}
              placeholder={t(config.searchPlaceholderKey)}
              className={searchInputClass}
            />
            {searchTerm.length > 0 && (
              <button
                data-testid={`${config.testIdPrefix}-search-clear`}
                type="button"
                onClick={list.clearSearch}
                title={t('common.actions.clearSearch')}
                aria-label={t('common.actions.clearSearch')}
                className={searchClearButtonClass}
              >
                <X className={defaultIconClass} aria-hidden="true" />
              </button>
            )}
          </div>

          <div className={toolbarActionsWrapperClass}>
            <button
              data-testid={`${config.testIdPrefix}-create-button`}
              type="button"
              onClick={onOpenCreateModal}
              className={`${referenceChipPrimaryButtonClass} ${toolbarActionGrowClass}`}
            >
              <Plus className={defaultIconClass} />
              {t(config.createLabelKey)}
            </button>
          </div>
        </div>
      </section>

      <div ref={listRef} className="min-w-0">
        <DataList
          breakpoint="3xl"
          columnsClassName={catalogColumnsClass}
          columns={columns}
          isLoading={list.isLoading}
          loadingText={t(config.loadingKey)}
          isEmpty={list.items.length === 0}
          emptyText={t(config.emptyKey)}
        >
          {list.items.map((item) => (
            <CatalogItemRow
              key={config.getId(item)}
              locale={locale}
              name={config.getName(item)}
              identifier={config.getIdentifier(item)}
              searchQuery={list.debouncedSearch}
              identifierLabel={t(config.identifierColumnKey)}
              netAmount={config.getNet(item)}
              netLabel={t(config.netColumnKey)}
              vatRatePercent={config.getVat(item)}
              vatLabel={t('common.fields.vat')}
              grossAmount={config.getGross(item)}
              grossLabel={t(config.grossColumnKey)}
              editLabel={t(config.editLabelKey)}
              deleteLabel={t(config.deleteLabelKey)}
              onEdit={() => { onOpenEditModal(item); }}
              onDelete={() => { onOpenDeleteModal(item); }}
            />
          ))}
        </DataList>
      </div>

      <Pagination
        page={list.page}
        totalCount={list.totalCount}
        pageSize={list.pageSize}
        onPageChange={list.setPage}
        isLoading={list.isFetching}
        testIdPrefix={config.paginationTestIdPrefix}
      />
    </div>
  );
}

CatalogTab.displayName = 'CatalogTab';

export { CatalogTab };
