/** List-state hook for the admin mechanic roster: the paged read, the delete mutation, search and paging. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useQueryReadFailureToast } from '../../../hooks/useReadFailureToast';
import { adminService, type MechanicListItem } from '../../../services/admin/admin.service';
import { PROFILE_PICTURE_UPDATED_EVENT } from '../../../services/profile/profile-picture-live.service';
import { adminQueries } from '../../../services/queries/admin.queries';
import { useAuthQueryScope } from '../../../services/queries/useAuthQueryScope';
import { queryKeys } from '../../../services/cache/queryKeys';
import { useListPaging } from '../../../hooks/useListPaging';
import type { PagedQuery, PagedResult } from '../../../types/common/pagination.types';
import type { ServerErrorBody } from '../../../utils/serverValidation';
import { MECHANIC_LIST_PAGE_SIZE } from './constants';

interface UseMechanicListStateParams {
  readonly showErrorToast: (messageKey: string, messageValues?: Record<string, string | number>) => string;
  readonly showSuccessToast: (messageKey: string, messageValues?: Record<string, string | number>) => string;
}

/** Stable empty page for the render before the read has data. */
const NO_MECHANICS: MechanicListItem[] = [];

/** Maps a failed delete to the toast that explains it. */
function getDeleteErrorKey(error: unknown): string {
  if (!isAxiosError<ServerErrorBody>(error)) {
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

export function useMechanicListState({
  showErrorToast,
  showSuccessToast,
}: UseMechanicListStateParams) {
  const queryClient = useQueryClient();
  const scope = useAuthQueryScope();
  const { searchTerm, setSearchTerm, debouncedSearch, page, setPage } = useListPaging();
  const [deleteTarget, setDeleteTarget] = useState<MechanicListItem | null>(null);

  const query = useMemo<PagedQuery>(() => {
    const search = debouncedSearch.trim();
    return search.length > 0
      ? { page, pageSize: MECHANIC_LIST_PAGE_SIZE, search }
      : { page, pageSize: MECHANIC_LIST_PAGE_SIZE };
  }, [debouncedSearch, page]);

  const { data, isError, isLoading, isSuccess, isPlaceholderData, errorUpdatedAt } = useQuery(
    adminQueries.mechanicsPage(scope, query),
  );
  const { data: allMechanics } = useQuery(adminQueries.mechanicOptions(scope));

  const mechanics = data?.items ?? NO_MECHANICS;
  const totalCount = data?.totalCount ?? 0;
  const lastPage = Math.max(1, Math.ceil(totalCount / MECHANIC_LIST_PAGE_SIZE));
  const removableMechanicCount = useMemo(
    () => (allMechanics ?? NO_MECHANICS).filter((item) => !item.isAdmin).length,
    [allMechanics],
  );

  if (data !== undefined && !isPlaceholderData && page > lastPage) {
    setPage(lastPage);
  }

  useQueryReadFailureToast({ data, isError, isSuccess, errorUpdatedAt }, 'admin.mechanicListError', showErrorToast);

  /** Marks every roster read (pages and option list) stale, so the mounted list refetches it. */
  const refreshRoster = useCallback(() => {
    if (scope === null) {
      return;
    }

    void queryClient.invalidateQueries({ queryKey: queryKeys.admin.mechanics(scope) });
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
        queryClient.setQueryData<PagedResult<MechanicListItem>>(
          adminQueries.mechanicsPage(scope, query).queryKey,
          (current) => (current === undefined ? current : {
            ...current,
            items: current.items.filter((mechanic) => mechanic.personId !== target.personId),
            totalCount: Math.max(0, current.totalCount - 1),
          }),
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

  const clearSearch = useCallback(() => {
    setSearchTerm('');
  }, [setSearchTerm]);

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
    totalCount,
    page,
    setPage,
    isPlaceholderData,
    removableMechanicCount,
    hasSearch: searchTerm.length > 0 || debouncedSearch.length > 0,
    searchTerm,
    setSearchTerm,
    clearSearch,
    deleteTarget,
    isDeleting,
    openDeleteModal,
    closeDeleteModal,
    handleDelete,
  };
}
