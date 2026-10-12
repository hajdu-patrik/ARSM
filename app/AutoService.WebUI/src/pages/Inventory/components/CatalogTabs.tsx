/** Parts and Labor types tabs: each mounts its own paged list (so the page size fits its own layout) inside the generic `CatalogTab`. */
import type { TFunction } from 'i18next';
import type { LaborTypeDto, PartDto } from '../../../types/catalog/catalog.types';
import { laborTypeCatalogTabConfig, partCatalogTabConfig } from '../catalogTab.config';
import { useLaborTypesList, usePartsList } from '../hooks/useCatalogState';
import { CatalogTab } from './CatalogTab';

interface CatalogTabsProps<TDto> {
  readonly t: TFunction;
  readonly locale: string;
  readonly showErrorToast: (key: string) => void;
  readonly onOpenCreateModal: () => void;
  readonly onOpenEditModal: (item: TDto) => void;
  readonly onOpenDeleteModal: (item: TDto) => void;
}

/** Parts tab. */
export function PartsCatalogTab({ showErrorToast, ...tabProps }: CatalogTabsProps<PartDto>) {
  const { list, listRef } = usePartsList({ showErrorToast });

  return <CatalogTab {...tabProps} list={list} listRef={listRef} config={partCatalogTabConfig} />;
}

/** Labor types tab. */
export function LaborTypesCatalogTab({ showErrorToast, ...tabProps }: CatalogTabsProps<LaborTypeDto>) {
  const { list, listRef } = useLaborTypesList({ showErrorToast });

  return <CatalogTab {...tabProps} list={list} listRef={listRef} config={laborTypeCatalogTabConfig} />;
}
