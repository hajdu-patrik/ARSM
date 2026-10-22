/** Subscribes to profile-picture SSE updates and re-dispatches them as a DOM event; connection lifecycle
 * lives in {@link createLiveUpdateChannel}. */

import { profileService } from './profile.service';
import { isRecord } from '../http/record-guard';
import { createLiveUpdateChannel, parseJsonObject } from '../live/live-update-channel';

export const PROFILE_PICTURE_UPDATED_EVENT = 'autoservice:profile-picture-updated';

export interface ProfilePictureUpdatedDetail {
  personId: number;
  hasProfilePicture: boolean;
  /** Cache-busting timestamp to force image reload. */
  cacheBuster: number;
}

function toProfilePictureUpdate(value: unknown): ProfilePictureUpdatedDetail | null {
  if (
    !isRecord(value) ||
    typeof value.personId !== 'number' ||
    typeof value.hasProfilePicture !== 'boolean' ||
    typeof value.cacheBuster !== 'number'
  ) {
    return null;
  }

  return { personId: value.personId, hasProfilePicture: value.hasProfilePicture, cacheBuster: value.cacheBuster };
}

function parseProfilePictureUpdate(data: string): ProfilePictureUpdatedDetail | null {
  return toProfilePictureUpdate(parseJsonObject(data));
}

/** Reads the payload of a profile-picture update DOM event, or null when the event carries no valid one. */
export function readProfilePictureUpdate(event: Event): ProfilePictureUpdatedDetail | null {
  return event instanceof CustomEvent ? toProfilePictureUpdate(event.detail) : null;
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
