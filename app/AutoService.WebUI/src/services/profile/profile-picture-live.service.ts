/** Subscribes to profile-picture SSE updates and re-dispatches them as a DOM event; connection lifecycle
 * lives in {@link createLiveUpdateChannel}. */

import { profileService } from './profile.service';
import { createLiveUpdateChannel, parseJsonObject } from '../live/live-update-channel';

/** Custom event name dispatched on profile picture changes. */
export const PROFILE_PICTURE_UPDATED_EVENT = 'autoservice:profile-picture-updated';

/** Detail payload for the {@code autoservice:profile-picture-updated} custom event. */
export interface ProfilePictureUpdatedDetail {
  /** Person ID whose profile picture changed. */
  personId: number;
  /** Whether the person currently has a profile picture. */
  hasProfilePicture: boolean;
  /** Cache-busting timestamp to force image reload. */
  cacheBuster: number;
}

/** Parses a raw SSE data string into a typed profile picture update detail, or null if invalid. */
function parseProfilePictureUpdate(data: string): ProfilePictureUpdatedDetail | null {
  const parsed = parseJsonObject(data);
  if (
    parsed === null ||
    typeof parsed.personId !== 'number' ||
    typeof parsed.hasProfilePicture !== 'boolean' ||
    typeof parsed.cacheBuster !== 'number'
  ) {
    return null;
  }

  return {
    personId: parsed.personId,
    hasProfilePicture: parsed.hasProfilePicture,
    cacheBuster: parsed.cacheBuster,
  };
}

const channel = createLiveUpdateChannel<ProfilePictureUpdatedDetail>({
  resolveUrl: () => profileService.getProfilePictureUpdatesUrl(),
  sseEventName: 'profile-picture-updated',
  domEventName: PROFILE_PICTURE_UPDATED_EVENT,
  parse: parseProfilePictureUpdate,
});

/** Subscribes to real-time profile picture updates; tears down the SSE connection when the last subscriber leaves. */
export function startProfilePictureLiveUpdates(): () => void {
  return channel.start();
}

/** Manually emits a profile picture updated event (e.g. after a local upload/delete); auto-fills the cache-buster. */
export function emitProfilePictureUpdated(
  detail: Omit<ProfilePictureUpdatedDetail, 'cacheBuster'> & { cacheBuster?: number | undefined },
): void {
  channel.dispatch({
    ...detail,
    cacheBuster: detail.cacheBuster ?? Date.now(),
  });
}
