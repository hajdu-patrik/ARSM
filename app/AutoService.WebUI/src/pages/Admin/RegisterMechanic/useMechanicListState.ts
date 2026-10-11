/** List-state hook for the admin mechanic roster: the roster read, the delete mutation, search and sorting. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useReadFailureToast } from '../../../hooks/useReadFailureToast';
import { adminService, type MechanicListItem } from '../../../services/admin/admin.service';
import { PROFILE_PICTURE_UPDATED_EVENT } from '../../../services/profile/profile-picture-live.service';
import { adminQueries } from '../../../services/queries/admin.queries';
import { useAuthQueryScope } from '../../../services/queries/useAuthQueryScope';
import { toIntlLocale } from '../../../utils/intlFormat';
import { normalizeSearchValue } from '../../../utils/textSearch';
import { buildMechanicDisplayName } from './helpers';
import type { SortDirection } from './types';

/** External dependencies for the mechanic list-state hook. */
interface UseMechanicListStateParams {
  readonly language: string;
  readonly showErrorToast: (messageKey: string, messageValues?: Record<string, string | number>) => string;
  readonly showSuccessToast: (messageKey: string, messageValues?: Record<string, string | number>) => string;
}

/** Error body of a rejected mechanic delete. */
interface DeleteErrorBody {
  detail?: string;
}

/** Stable empty roster for the render before the read has data. */
const NO_MECHANICS: MechanicListItem[] = [];

/** Maps a failed delete to the toast that explains it. */
function getDeleteErrorKey(error: unknown): string {
  if (!isAxiosError<DeleteErrorBody>(error)) {
    return 'admin.mechanicDeleteFailed';
  }

  const status = error.response?.status;
  const body = error.response?.data;
  const detail = body?.detail ?? '';

  if (status === 422 && detail.includes('appointments would be left without')) {
    return 'admin.mechanicDeleteHasAppointments';
  }

  if (status === 422 && detail.includes('last remaining mechanic')) {
    return 'admin.mechanicDeleteLastMechanic';
  }

  if (status === 403) {
    return 'admin.mechanicDeleteForbidden';
  }

  if (status === 409) {
    return 'admin.mechanicDeleteConflict';
  }

  return status === 500 ? 'admin.mechanicDeleteIdentityFailed' : 'admin.mechanicDeleteFailed';
}

/** Narrows the roster to the normalized name search, then sorts it by display name in the given direction. */
function selectVisibleMechanics(
  mechanics: MechanicListItem[],
  normalizedSearchTerm: string,
  collator: Intl.Collator,
  sortDirection: SortDirection,
): MechanicListItem[] {
  const filtered = normalizedSearchTerm.length > 0
    ? mechanics.filter((mechanic) => (
      normalizeSearchValue(buildMechanicDisplayName(mechanic)).includes(normalizedSearchTerm)
    ))
    : mechanics;

  const directionMultiplier = sortDirection === 'asc' ? 1 : -1;

  return [...filtered].sort((left, right) => (
    collator.compare(buildMechanicDisplayName(left), buildMechanicDisplayName(right)) * directionMultiplier
  ));
}

/** Manages the admin mechanic roster: the cached read, delete flow, name search, and locale-aware sorting. */
export function useMechanicListState({
  language,
  showErrorToast,
  showSuccessToast,
}: UseMechanicListStateParams) {
  const queryClient = useQueryClient();
  const scope = useAuthQueryScope();
  const { data, isError, isLoading, isSuccess, errorUpdatedAt } = useQuery(adminQueries.mechanics(scope));
  const [searchTerm, setSearchTerm] = useState('');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [deleteTarget, setDeleteTarget] = useState<MechanicListItem | null>(null);

  const mechanics = data ?? NO_MECHANICS;
  const collator = useMemo(() => new Intl.Collator(toIntlLocale(language), { sensitivity: 'base' }), [language]);

  useReadFailureToast({
    failureMessageKey: isError && data === undefined ? 'admin.mechanicListError' : null,
    errorUpdatedAt,
    isSuccess,
    showErrorToast,
  });

  /** Marks the roster stale, so the mounted list refetches it. */
  const refreshRoster = useCallback(() => {
    if (scope === null) {
      return;
    }

    void queryClient.invalidateQueries({ queryKey: adminQueries.mechanics(scope).queryKey });
  }, [queryClient, scope]);

  useEffect(() => {
    globalThis.addEventListener(PROFILE_PICTURE_UPDATED_EVENT, refreshRoster);
    return () => {
      globalThis.removeEventListener(PROFILE_PICTURE_UPDATED_EVENT, refreshRoster);
    };
  }, [refreshRoster]);

  const { mutate: deleteMechanic, isPending: isDeleting } = useMutation({
    mutationFn: (target: MechanicListItem) => adminService.deleteMechanic(target.personId),
    onSuccess: (_result, target) => {
      if (scope !== null) {
        queryClient.setQueryData<MechanicListItem[]>(
          adminQueries.mechanics(scope).queryKey,
          (roster) => roster?.filter((mechanic) => mechanic.personId !== target.personId),
        );
      }

      refreshRoster();
      showSuccessToast('admin.mechanicDeleted', { email: target.email });
      setDeleteTarget(null);
    },
    onError: (error) => {
      showErrorToast(getDeleteErrorKey(error));
    },
  });

  const uniqueMechanics = useMemo(
    () => Array.from(new Map(mechanics.map((mechanic) => [mechanic.personId, mechanic])).values()),
    [mechanics],
  );

  const normalizedSearchTerm = useMemo(() => normalizeSearchValue(searchTerm), [searchTerm]);

  const visibleMechanics = useMemo(
    () => selectVisibleMechanics(uniqueMechanics, normalizedSearchTerm, collator, sortDirection),
    [collator, normalizedSearchTerm, sortDirection, uniqueMechanics],
  );

  const clearSearch = useCallback(() => {
    setSearchTerm('');
  }, []);

  const toggleSortDirection = useCallback(() => {
    setSortDirection((previous) => (previous === 'asc' ? 'desc' : 'asc'));
  }, []);

  const openDeleteModal = useCallback((mechanic: MechanicListItem) => {
    setDeleteTarget(mechanic);
  }, []);

  const closeDeleteModal = useCallback(() => {
    if (isDeleting) {
      return;
    }

    setDeleteTarget(null);
  }, [isDeleting]);

  const handleDelete = useCallback(() => {
    if (deleteTarget) {
      deleteMechanic(deleteTarget);
    }
  }, [deleteMechanic, deleteTarget]);

  return {
    isLoading,
    mechanics,
    searchTerm,
    setSearchTerm,
    sortDirection,
    toggleSortDirection,
    clearSearch,
    visibleMechanics,
    deleteTarget,
    isDeleting,
    openDeleteModal,
    closeDeleteModal,
    handleDelete,
  };
}
