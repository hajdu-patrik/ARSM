/**
 * Catalog (parts and labor types) list-state hook.
 *
 * Loads both catalog lists, applies the name/identifier search and
 * identifier sort shared by both tabs, and keeps the authenticated query
 * cache in sync. Fetch/cache/search/sort is identical in shape for both
 * entities, so it is written once as an internal generic helper and
 * instantiated twice instead of duplicated per tab.
 * @module pages/Inventory/hooks/useCatalogState
 */
import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { useQueryClient, type QueryClient, type QueryKey } from '@tanstack/react-query';
import type { LaborTypeDto, PartDto } from '../../../types/catalog/catalog.types';
import { partService } from '../../../services/catalog/part.service';
import { laborTypeService } from '../../../services/catalog/labor-type.service';
import { CATALOG_STALE_TIME_MS, PERSISTED_QUERY_CACHE_MAX_AGE_MS } from '../../../services/cache/cache-policy';
import { getAuthQueryScope, queryKeys, type AuthQueryScope } from '../../../services/cache/queryKeys';
import { useAuthStore } from '../../../store/auth.store';
import { normalizeCatalogSearchValue } from '../helpers';

/** Sort direction used by both catalog list toolbars. */
export type CatalogSortDirection = 'asc' | 'desc';

/** State and actions exposed for a single catalog entity list (parts or labor types). */
export interface CatalogEntityListState<TDto> {
  readonly items: TDto[];
  readonly setItems: Dispatch<SetStateAction<TDto[]>>;
  readonly filteredItems: TDto[];
  readonly isLoading: boolean;
  readonly searchTerm: string;
  readonly setSearchTerm: (value: string) => void;
  readonly clearSearch: () => void;
  readonly sortDirection: CatalogSortDirection;
  readonly toggleSortDirection: () => void;
  readonly load: (force?: boolean) => Promise<void>;
}

/** Dependencies for a single catalog entity list instance (parts or labor types). */
interface UseCatalogEntityListParams<TDto> {
  authScope: AuthQueryScope | null;
  queryKey: (scope: AuthQueryScope) => QueryKey;
  fetchList: () => Promise<TDto[]>;
  getIdentifier: (item: TDto) => string;
  getName: (item: TDto) => string;
  loadErrorToastKey: string;
  language: string;
  showErrorToast: (key: string) => void;
}

/**
 * Resolves React set-state payloads so cache synchronization can mirror state updates exactly.
 * @param update Direct state value or updater callback.
 * @param previous Previous state value supplied by React.
 * @returns The next state value.
 */
function resolveStateUpdate<T>(update: SetStateAction<T>, previous: T): T {
  return typeof update === 'function' ? (update as (previousValue: T) => T)(previous) : update;
}

/**
 * Loads, caches, searches, and sorts a single catalog entity list (parts or labor types).
 * Internal generic implementation instantiated twice by {@link useCatalogState}.
 * @param params Fetch/query-key/identifier accessors and the toast handler for one entity.
 * @returns List state, search/sort controls, and the loader for one catalog entity.
 */
function useCatalogEntityList<TDto>({
  authScope,
  queryKey,
  fetchList,
  getIdentifier,
  getName,
  loadErrorToastKey,
  language,
  showErrorToast,
}: UseCatalogEntityListParams<TDto>): CatalogEntityListState<TDto> {
  const queryClient = useQueryClient();
  const [items, setItems] = useState<TDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortDirection, setSortDirection] = useState<CatalogSortDirection>('asc');
  const collator = useMemo(() => new Intl.Collator(language, { sensitivity: 'base' }), [language]);

  const setItemsWithCache = useCallback<Dispatch<SetStateAction<TDto[]>>>((update) => {
    setItems((previous) => {
      const next = resolveStateUpdate(update, previous);

      if (authScope) {
        (queryClient as QueryClient).setQueryData(queryKey(authScope), next);
      }

      return next;
    });
  }, [authScope, queryClient, queryKey]);

  const load = useCallback(async (force = false) => {
    if (!authScope) {
      setItemsWithCache([]);
      setIsLoading(false);
      return;
    }

    const key = queryKey(authScope);
    const cached = force ? undefined : queryClient.getQueryData<TDto[]>(key);

    if (cached) {
      setItemsWithCache(cached);
    }

    setIsLoading(!cached);

    try {
      if (force) {
        await queryClient.invalidateQueries({ exact: true, queryKey: key });
      }

      const data = await queryClient.fetchQuery({
        gcTime: PERSISTED_QUERY_CACHE_MAX_AGE_MS,
        queryFn: fetchList,
        queryKey: key,
        staleTime: CATALOG_STALE_TIME_MS,
      });
      setItemsWithCache(data);
    } catch {
      if (!cached) {
        showErrorToast(loadErrorToastKey);
      }
    } finally {
      setIsLoading(false);
    }
  }, [authScope, fetchList, loadErrorToastKey, queryClient, queryKey, setItemsWithCache, showErrorToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const normalizedSearchTerm = useMemo(() => normalizeCatalogSearchValue(searchTerm), [searchTerm]);

  const filteredItems = useMemo(() => {
    const filtered = normalizedSearchTerm.length > 0
      ? items.filter((item) => (
        normalizeCatalogSearchValue(getName(item)).includes(normalizedSearchTerm)
        || normalizeCatalogSearchValue(getIdentifier(item)).includes(normalizedSearchTerm)
      ))
      : items;

    return [...filtered].sort((left, right) => {
      const directionMultiplier = sortDirection === 'asc' ? 1 : -1;
      return collator.compare(getIdentifier(left), getIdentifier(right)) * directionMultiplier;
    });
  }, [collator, getIdentifier, getName, items, normalizedSearchTerm, sortDirection]);

  const clearSearch = useCallback(() => setSearchTerm(''), []);
  const toggleSortDirection = useCallback(() => setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc')), []);

  return {
    items,
    setItems: setItemsWithCache,
    filteredItems,
    isLoading,
    searchTerm,
    setSearchTerm,
    clearSearch,
    sortDirection,
    toggleSortDirection,
    load,
  };
}

/** External dependencies for the catalog list-state hook. */
interface UseCatalogStateParams {
  language: string;
  showErrorToast: (key: string) => void;
}

/**
 * Manages Inventory page read-side state: parts and labor-type list loading,
 * per-tab search/sort, and query-cache synchronization.
 * @param params Locale for identifier collation and the error toast handler.
 * @returns Independent list state for the Parts and Labor types tabs.
 */
export function useCatalogState({ language, showErrorToast }: UseCatalogStateParams) {
  const authUser = useAuthStore((state) => state.user);
  const authScope = useMemo(() => getAuthQueryScope(authUser), [authUser]);

  const parts = useCatalogEntityList<PartDto>({
    authScope,
    queryKey: queryKeys.catalog.parts,
    fetchList: partService.listParts,
    getIdentifier: (part) => part.partNumber,
    getName: (part) => part.name,
    loadErrorToastKey: 'inventory.errors.loadPartsFailed',
    language,
    showErrorToast,
  });

  const laborTypes = useCatalogEntityList<LaborTypeDto>({
    authScope,
    queryKey: queryKeys.catalog.laborTypes,
    fetchList: laborTypeService.listLaborTypes,
    getIdentifier: (laborType) => laborType.code,
    getName: (laborType) => laborType.name,
    loadErrorToastKey: 'inventory.errors.loadLaborTypesFailed',
    language,
    showErrorToast,
  });

  return { parts, laborTypes };
}
