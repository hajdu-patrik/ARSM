/** Sidebar profile: the own-profile read shared with Settings, plus live picture updates,
 * shaped as the view model the sidebar renders. */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { AuthQueryScope } from '../../services/cache/queryKeys';
import { profileService } from '../../services/profile/profile.service';
import {
  PROFILE_PICTURE_UPDATED_EVENT,
  readProfilePictureUpdate,
  startProfilePictureLiveUpdates,
} from '../../services/profile/profile-picture-live.service';
import { profileQueries } from '../../services/queries/profile.queries';
import { useAuthQueryScope } from '../../services/queries/useAuthQueryScope';
import { useAuthStore } from '../../store/auth.store';
import { getAvatarInitials, getDeterministicAvatarColor } from '../../utils/avatar';
import type { SidebarProfileViewModel } from './SidebarContent';

/** Picture version of this page load; a live picture update replaces it, so a changed picture is fetched again. */
const PAGE_LOAD_PICTURE_VERSION = Date.now();

/** Keeps the picture channel open while the sidebar is mounted; returns the newest live picture version
 * of this person (null before any update) and refetches the shared profile on each update. */
function useLivePictureVersion(personId: number | null, scope: AuthQueryScope | null): number | null {
  const queryClient = useQueryClient();
  const [livePictureVersion, setLivePictureVersion] = useState<number | null>(null);

  useEffect(() => startProfilePictureLiveUpdates(), []);

  useEffect(() => {
    const handlePictureUpdated = (event: Event) => {
      const update = readProfilePictureUpdate(event);
      if (update === null || update.personId !== personId) {
        return;
      }

      setLivePictureVersion(update.cacheBuster);
      void queryClient.invalidateQueries({ queryKey: profileQueries.me(scope).queryKey });
    };

    globalThis.addEventListener(PROFILE_PICTURE_UPDATED_EVENT, handlePictureUpdated);
    return () => {
      globalThis.removeEventListener(PROFILE_PICTURE_UPDATED_EVENT, handlePictureUpdated);
    };
  }, [personId, queryClient, scope]);

  return livePictureVersion;
}

/** Builds the sidebar's profile view model; the profile read is a query, so Settings edits and refetches reach it. */
export function useSidebarProfile(): SidebarProfileViewModel {
  const userPersonId = useAuthStore((state) => state.user?.personId ?? null);
  const scope = useAuthQueryScope();
  const { data: profile } = useQuery(profileQueries.me(scope));
  const personId = profile?.personId ?? userPersonId;
  const livePictureVersion = useLivePictureVersion(personId, scope);
  const [failedPictureUrl, setFailedPictureUrl] = useState<string | null>(null);

  const firstName = profile?.firstName ?? null;
  const lastName = profile?.lastName ?? null;
  const email = profile?.email ?? null;
  const pictureOwner = personId === null ? 'me' : String(personId);
  const pictureVersion = String(livePictureVersion ?? PAGE_LOAD_PICTURE_VERSION);
  const profilePictureUrl = `${profileService.getProfilePictureUrl()}?pid=${pictureOwner}&v=${pictureVersion}`;
  const showProfilePicture = profile?.hasProfilePicture === true && failedPictureUrl !== profilePictureUrl;
  const initials = getAvatarInitials(firstName, lastName, email);
  const fallbackAvatarColorClass = getDeterministicAvatarColor(personId ?? email);

  const markAvatarLoadFailed = useCallback(() => {
    setFailedPictureUrl(profilePictureUrl);
  }, [profilePictureUrl]);

  return useMemo(() => ({
    initials,
    fallbackAvatarColorClass,
    showProfilePicture,
    profilePictureUrl,
    firstName,
    lastName,
    email,
    onAvatarLoadFailed: markAvatarLoadFailed,
  }), [
    email,
    fallbackAvatarColorClass,
    firstName,
    initials,
    lastName,
    markAvatarLoadFailed,
    profilePictureUrl,
    showProfilePicture,
  ]);
}
