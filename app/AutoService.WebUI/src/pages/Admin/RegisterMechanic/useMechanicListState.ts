/** List-state hook for the admin mechanic roster: data loading, delete flow, search, and sorting. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { isAxiosError } from 'axios';
import { adminService, type MechanicListItem } from '../../../services/admin/admin.service';
import { PROFILE_PICTURE_UPDATED_EVENT } from '../../../services/profile/profile-picture-live.service';
import { normalizeSearchValue } from '../../../utils/textSearch';
import { buildMechanicDisplayName } from './helpers';
import type { SortDirection } from './types';

/** External dependencies for the mechanic list-state hook. */
interface UseMechanicListStateParams {
  readonly refreshKey: number;
  readonly language: string;
  readonly showErrorToast: (messageKey: string, messageValues?: Record<string, string | number>) => string;
  readonly showSuccessToast: (messageKey: string, messageValues?: Record<string, string | number>) => string;
}

/** Manages the admin mechanic roster: loading, delete flow, name search, and locale-aware sorting. */
export function useMechanicListState({
  refreshKey,
  language,
  showErrorToast,
  showSuccessToast,
}: UseMechanicListStateParams) {
  const [mechanics, setMechanics] = useState<MechanicListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [deleteTarget, setDeleteTarget] = useState<MechanicListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const collator = useMemo(() => new Intl.Collator(language, { sensitivity: 'base' }), [language]);

  /** Fetches the mechanic roster from the admin service and updates local state. */
  const loadMechanics = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await adminService.listMechanics();
      setMechanics(data);
    } catch {
      showErrorToast('admin.mechanicListError');
    } finally {
      setIsLoading(false);
    }
  }, [showErrorToast]);

  useEffect(() => {
    void loadMechanics();
  }, [loadMechanics, refreshKey]);

  useEffect(() => {
    const handleProfilePictureUpdated = () => {
      void loadMechanics();
    };

    globalThis.addEventListener(PROFILE_PICTURE_UPDATED_EVENT, handleProfilePictureUpdated);
    return () => {
      globalThis.removeEventListener(PROFILE_PICTURE_UPDATED_EVENT, handleProfilePictureUpdated);
    };
  }, [loadMechanics]);

  const uniqueMechanics = useMemo(
    () => Array.from(new Map(mechanics.map((mechanic) => [mechanic.personId, mechanic])).values()),
    [mechanics],
  );

  const normalizedSearchTerm = useMemo(() => normalizeSearchValue(searchTerm), [searchTerm]);

  const visibleMechanics = useMemo(() => {
    const filtered = normalizedSearchTerm.length > 0
      ? uniqueMechanics.filter((mechanic) => (
        normalizeSearchValue(buildMechanicDisplayName(mechanic)).includes(normalizedSearchTerm)
      ))
      : uniqueMechanics;

    const directionMultiplier = sortDirection === 'asc' ? 1 : -1;

    return [...filtered].sort((left, right) => (
      collator.compare(buildMechanicDisplayName(left), buildMechanicDisplayName(right)) * directionMultiplier
    ));
  }, [collator, normalizedSearchTerm, sortDirection, uniqueMechanics]);

  const clearSearch = useCallback(() => setSearchTerm(''), []);
  const toggleSortDirection = useCallback(() => setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc')), []);

  const openDeleteModal = useCallback((mechanic: MechanicListItem) => {
    setDeleteTarget(mechanic);
  }, []);

  const closeDeleteModal = useCallback(() => {
    if (isDeleting) {
      return;
    }

    setDeleteTarget(null);
  }, [isDeleting]);

  /** Deletes the selected mechanic and maps known API error responses to toast messages. */
  const handleDelete = useCallback(async () => {
    if (!deleteTarget) {
      return;
    }

    setIsDeleting(true);
    try {
      await adminService.deleteMechanic(deleteTarget.personId);
      setMechanics((previousMechanics) => (
        previousMechanics.filter((mechanicItem) => mechanicItem.personId !== deleteTarget.personId)
      ));
      showSuccessToast('admin.mechanicDeleted', { email: deleteTarget.email });
      setDeleteTarget(null);
    } catch (error) {
      if (isAxiosError<{ detail?: string }>(error)) {
        const status = error.response?.status;
        const detail = error.response?.data?.detail ?? '';

        if (status === 422 && detail.includes('appointments would be left without')) {
          showErrorToast('admin.mechanicDeleteHasAppointments');
        } else if (status === 422 && detail.includes('last remaining mechanic')) {
          showErrorToast('admin.mechanicDeleteLastMechanic');
        } else if (status === 403) {
          showErrorToast('admin.mechanicDeleteForbidden');
        } else if (status === 409) {
          showErrorToast('admin.mechanicDeleteConflict');
        } else if (status === 500) {
          showErrorToast('admin.mechanicDeleteIdentityFailed');
        } else {
          showErrorToast('admin.mechanicDeleteFailed');
        }
      } else {
        showErrorToast('admin.mechanicDeleteFailed');
      }
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTarget, showErrorToast, showSuccessToast]);

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
