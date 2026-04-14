/**
 * Hook for loading the full mechanic list in admin appointment-detail flows.
 *
 * Fetches all mechanics when the modal is open and the user is an admin,
 * and refreshes the list on profile-picture-update SSE events so that
 * avatar URLs stay current.
 *
 * @module useAdminMechanics
 */
import { useCallback, useEffect, useState } from 'react';
import { adminService } from '../../../services/admin/admin.service';
import { PROFILE_PICTURE_UPDATED_EVENT } from '../../../services/profile/profile-picture-live.service';
import type { MechanicListItem } from '../../../services/admin/admin.service';

/**
 * Provides the list of all mechanics for admin assign/unassign flows.
 *
 * @param isAdmin - Whether the current user has admin privileges.
 * @param isOpen  - Whether the consuming modal/panel is currently visible.
 * @returns Object containing `allMechanics` array.
 */
export function useAdminMechanics(isAdmin: boolean, isOpen: boolean) {
  const [allMechanics, setAllMechanics] = useState<MechanicListItem[]>([]);

  const loadAllMechanics = useCallback(async () => {
    if (!isAdmin || !isOpen) {
      return;
    }

    try {
      const data = await adminService.listMechanics();
      setAllMechanics(data);
    } catch (err) {
      if (import.meta.env.DEV) console.error('[useAdminMechanics] Failed to load mechanics:', err);
    }
  }, [isAdmin, isOpen]);

  useEffect(() => {
    void loadAllMechanics();
  }, [loadAllMechanics]);

  useEffect(() => {
    if (!isAdmin || !isOpen) {
      return;
    }

    const handleProfilePictureUpdated = () => {
      void loadAllMechanics();
    };

    globalThis.addEventListener(PROFILE_PICTURE_UPDATED_EVENT, handleProfilePictureUpdated);
    return () => {
      globalThis.removeEventListener(PROFILE_PICTURE_UPDATED_EVENT, handleProfilePictureUpdated);
    };
  }, [isAdmin, isOpen, loadAllMechanics]);

  return {
    allMechanics,
  };
}
