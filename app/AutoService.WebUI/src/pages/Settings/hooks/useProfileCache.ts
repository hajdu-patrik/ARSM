/** Cache writers behind the profile writes: the own-profile read and the admin roster that lists the same person. */

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../services/cache/queryKeys';
import { profileQueries } from '../../../services/queries/profile.queries';
import { useAuthQueryScope } from '../../../services/queries/useAuthQueryScope';
import type { ProfileData } from '../../../types/profile/profile.types';

export function useProfileCache() {
  const queryClient = useQueryClient();
  const scope = useAuthQueryScope();

  /** Stores the profile a write returned, so every observer of the profile read shows it without a refetch. */
  const storeProfile = useCallback((profile: ProfileData) => {
    if (scope === null) {
      return;
    }

    queryClient.setQueryData<ProfileData>(profileQueries.me(scope).queryKey, profile);
  }, [queryClient, scope]);

  /** Records whether the cached profile has a picture after an upload or a removal. */
  const storePictureState = useCallback((hasProfilePicture: boolean) => {
    if (scope === null) {
      return;
    }

    queryClient.setQueryData<ProfileData>(
      profileQueries.me(scope).queryKey,
      (profile) => (profile === undefined ? profile : { ...profile, hasProfilePicture }),
    );
  }, [queryClient, scope]);

  /** Marks the admin mechanic roster stale: it lists this person's name, email and picture flag. */
  const invalidateRoster = useCallback(() => {
    if (scope === null) {
      return;
    }

    void queryClient.invalidateQueries({ queryKey: queryKeys.admin.mechanics(scope) });
  }, [queryClient, scope]);

  return { storeProfile, storePictureState, invalidateRoster };
}
