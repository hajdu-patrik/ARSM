/** Catalog list-state hook: reads parts and labor types through the shared catalog queries and owns the search and sort of each tab. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { LaborTypeDto, PartDto } from '../../../types/catalog/catalog.types';
import { catalogQueries } from '../../../services/queries/catalog.queries';
import { useAuthQueryScope } from '../../../services/queries/useAuthQueryScope';
import { toIntlLocale } from '../../../utils/intlFormat';
import { normalizeSearchValue } from '../../../utils/textSearch';
import { laborTypeCatalogTabConfig, partCatalogTabConfig } from '../catalogTab.config';

/** Sort direction used by both catalog list toolbars. */
export type CatalogSortDirection = 'asc' | 'desc';

/** State and actions exposed for a single catalog entity list (parts or labor types). */
export interface CatalogEntityListState<TDto> {
  readonly filteredItems: TDto[];
  readonly isLoading: boolean;
  readonly searchTerm: string;
  readonly setSearchTerm: (value: string) => void;
  readonly clearSearch: () => void;
  readonly sortDirection: CatalogSortDirection;
  readonly toggleSortDirection: () => void;
}

/** Rows shown while a list has not loaded; one shared array per entity keeps the filter memo stable. */
const NO_PARTS: PartDto[] = [];
const NO_LABOR_TYPES: LaborTypeDto[] = [];

/** Dependencies for a single catalog entity list instance (parts or labor types). */
interface UseCatalogEntityListParams<TDto> {
  items: readonly TDto[];
  isLoading: boolean;
  hasLoadFailed: boolean;
  loadErrorToastKey: string;
  getIdentifier: (item: TDto) => string;
  getName: (item: TDto) => string;
  language: string;
  showErrorToast: (key: string) => void;
}

/** Searches and sorts the rows of one catalog entity list and toasts a failed first load; instantiated twice by {@link useCatalogState}. */
function useCatalogEntityList<TDto>({
  items,
  isLoading,
  hasLoadFailed,
  loadErrorToastKey,
  getIdentifier,
  getName,
  language,
  showErrorToast,
}: UseCatalogEntityListParams<TDto>): CatalogEntityListState<TDto> {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortDirection, setSortDirection] = useState<CatalogSortDirection>('asc');
  const collator = useMemo(() => new Intl.Collator(toIntlLocale(language), { sensitivity: 'base' }), [language]);
  const normalizedSearchTerm = useMemo(() => normalizeSearchValue(searchTerm), [searchTerm]);

  useEffect(() => {
    if (hasLoadFailed) {
      showErrorToast(loadErrorToastKey);
    }
  }, [hasLoadFailed, loadErrorToastKey, showErrorToast]);

  const filteredItems = useMemo(() => {
    const filtered = normalizedSearchTerm.length > 0
      ? items.filter((item) => (
        normalizeSearchValue(getName(item)).includes(normalizedSearchTerm)
        || normalizeSearchValue(getIdentifier(item)).includes(normalizedSearchTerm)
      ))
      : items;
    const directionMultiplier = sortDirection === 'asc' ? 1 : -1;

    return [...filtered].sort((left, right) => (
      collator.compare(getIdentifier(left), getIdentifier(right)) * directionMultiplier
    ));
  }, [collator, getIdentifier, getName, items, normalizedSearchTerm, sortDirection]);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
  }, []);

  const toggleSortDirection = useCallback(() => {
    setSortDirection((previous) => (previous === 'asc' ? 'desc' : 'asc'));
  }, []);

  return {
    filteredItems,
    isLoading,
    searchTerm,
    setSearchTerm,
    clearSearch,
    sortDirection,
    toggleSortDirection,
  };
}

/** External dependencies for the catalog list-state hook. */
interface UseCatalogStateParams {
  language: string;
  showErrorToast: (key: string) => void;
}

/** Manages Inventory page read-side state: the parts and labor-type reads plus the search and sort of each tab. */
export function useCatalogState({ language, showErrorToast }: UseCatalogStateParams) {
  const scope = useAuthQueryScope();
  const partsQuery = useQuery(catalogQueries.parts(scope));
  const laborTypesQuery = useQuery(catalogQueries.laborTypes(scope));

  const parts = useCatalogEntityList({
    items: partsQuery.data ?? NO_PARTS,
    isLoading: partsQuery.isLoading,
    hasLoadFailed: partsQuery.isLoadingError && !partsQuery.isFetching,
    loadErrorToastKey: 'inventory.errors.loadPartsFailed',
    getIdentifier: partCatalogTabConfig.getIdentifier,
    getName: partCatalogTabConfig.getName,
    language,
    showErrorToast,
  });

  const laborTypes = useCatalogEntityList({
    items: laborTypesQuery.data ?? NO_LABOR_TYPES,
    isLoading: laborTypesQuery.isLoading,
    hasLoadFailed: laborTypesQuery.isLoadingError && !laborTypesQuery.isFetching,
    loadErrorToastKey: 'inventory.errors.loadLaborTypesFailed',
    getIdentifier: laborTypeCatalogTabConfig.getIdentifier,
    getName: laborTypeCatalogTabConfig.getName,
    language,
    showErrorToast,
  });

  return { parts, laborTypes };
}
