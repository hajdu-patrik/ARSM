import { useCallback, useEffect, useState } from 'react';
import { adminService } from '../../../services/admin/admin.service';
import { PROFILE_PICTURE_UPDATED_EVENT } from '../../../services/profile/profile-picture-live.service';
import type { MechanicListItem } from '../../../services/admin/admin.service';

export function useAdminMechanics(isAdmin: boolean, isOpen: boolean) {
  const [allMechanics, setAllMechanics] = useState<MechanicListItem[]>([]);

  const loadAllMechanics = useCallback(async () => {
    if (!isAdmin || !isOpen) {
      return;
    }

    try {
      const data = await adminService.listMechanics();
      setAllMechanics(data);
    } catch {
      // Silently fail - dropdown will be empty
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

    globalThis.addEventListener(PROFILE_PICTURE_UPDATED_EVENT, handleProfilePictureUpdated as EventListener);
    return () => {
      globalThis.removeEventListener(PROFILE_PICTURE_UPDATED_EVENT, handleProfilePictureUpdated as EventListener);
    };
  }, [isAdmin, isOpen, loadAllMechanics]);

  return {
    allMechanics,
  };
}
