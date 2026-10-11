/** Loads the full mechanic list for admin flows; refetches when a profile picture changes. */
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { MechanicListItem } from '../../../services/admin/admin.service';
import { PROFILE_PICTURE_UPDATED_EVENT } from '../../../services/profile/profile-picture-live.service';
import { adminQueries } from '../../../services/queries/admin.queries';
import { useAuthQueryScope } from '../../../services/queries/useAuthQueryScope';
import { logError } from '../../../utils/devLog';

/** Shared empty list, so an unloaded roster keeps one stable reference between renders. */
const NO_MECHANICS: MechanicListItem[] = [];

/** Provides the list of all mechanics for admin assign/unassign flows; only admins fetch it. */
export function useAdminMechanics(isAdmin: boolean) {
  const queryClient = useQueryClient();
  const scope = useAuthQueryScope();
  const { data, error } = useQuery({ ...adminQueries.mechanics(scope), enabled: isAdmin });

  useEffect(() => {
    if (error) {
      logError('scheduler.adminMechanics', error);
    }
  }, [error]);

  useEffect(() => {
    if (!isAdmin) {
      return undefined;
    }

    const refreshMechanics = () => {
      void queryClient.invalidateQueries({ queryKey: adminQueries.mechanics(scope).queryKey });
    };

    globalThis.addEventListener(PROFILE_PICTURE_UPDATED_EVENT, refreshMechanics);
    return () => {
      globalThis.removeEventListener(PROFILE_PICTURE_UPDATED_EVENT, refreshMechanics);
    };
  }, [isAdmin, queryClient, scope]);

  return {
    allMechanics: data ?? NO_MECHANICS,
  };
}
