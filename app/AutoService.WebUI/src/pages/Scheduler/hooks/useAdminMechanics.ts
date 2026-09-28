/** Loads the full mechanic list for admin flows; refreshes on profile-picture-update SSE events. */
import { useCallback, useEffect, useState } from 'react';
import { adminService } from '../../../services/admin/admin.service';
import { PROFILE_PICTURE_UPDATED_EVENT } from '../../../services/profile/profile-picture-live.service';
import type { MechanicListItem } from '../../../services/admin/admin.service';

/** Provides the list of all mechanics for admin assign/unassign flows. */
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
    if (!isAdmin || !isOpen) {
      return;
    }

    const initialLoadTimer = globalThis.setTimeout(() => {
      void loadAllMechanics();
    }, 0);

    const handleProfilePictureUpdated = () => {
      void loadAllMechanics();
    };

    globalThis.addEventListener(PROFILE_PICTURE_UPDATED_EVENT, handleProfilePictureUpdated);
    return () => {
      globalThis.clearTimeout(initialLoadTimer);
      globalThis.removeEventListener(PROFILE_PICTURE_UPDATED_EVENT, handleProfilePictureUpdated);
    };
  }, [isAdmin, isOpen, loadAllMechanics]);

  return {
    allMechanics,
  };
}
