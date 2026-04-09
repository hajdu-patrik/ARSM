import { profileService } from './profile.service';
import { apiClient } from './api.client';

export const PROFILE_PICTURE_UPDATED_EVENT = 'autoservice:profile-picture-updated';

export interface ProfilePictureUpdatedDetail {
  personId: number;
  hasProfilePicture: boolean;
  cacheBuster: number;
}

let eventSource: EventSource | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let subscriberCount = 0;

function dispatchProfilePictureUpdate(detail: ProfilePictureUpdatedDetail): void {
  globalThis.dispatchEvent(new CustomEvent(PROFILE_PICTURE_UPDATED_EVENT, { detail }));
}

function parseProfilePictureUpdate(data: string): ProfilePictureUpdatedDetail | null {
  try {
    const parsed = JSON.parse(data) as Partial<ProfilePictureUpdatedDetail>;
    if (
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
  } catch {
    return null;
  }
}

function scheduleReconnect(): void {
  if (reconnectTimer !== null || subscriberCount < 1) {
    return;
  }

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectToProfilePictureUpdates();
  }, 2000);
}

async function refreshSessionIfPossible(): Promise<void> {
  try {
    await apiClient.post('/api/auth/refresh');
  } catch {
    // Ignore refresh failures; reconnect attempts will continue and recover after next successful login.
  }
}

function connectToProfilePictureUpdates(): void {
  if (subscriberCount < 1 || eventSource !== null) {
    return;
  }

  const source = new EventSource(profileService.getProfilePictureUpdatesUrl(), { withCredentials: true });

  source.addEventListener('profile-picture-updated', (event) => {
    const messageEvent = event as MessageEvent<string>;
    const detail = parseProfilePictureUpdate(messageEvent.data);
    if (detail) {
      dispatchProfilePictureUpdate(detail);
    }
  });

  source.onerror = () => {
    source.close();
    if (eventSource === source) {
      eventSource = null;
    }
    void refreshSessionIfPossible().finally(() => {
      scheduleReconnect();
    });
  };

  eventSource = source;
}

export function startProfilePictureLiveUpdates(): () => void {
  subscriberCount += 1;
  connectToProfilePictureUpdates();

  return () => {
    subscriberCount = Math.max(0, subscriberCount - 1);
    if (subscriberCount > 0) {
      return;
    }

    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
  };
}

export function emitProfilePictureUpdated(detail: Omit<ProfilePictureUpdatedDetail, 'cacheBuster'> & { cacheBuster?: number }): void {
  dispatchProfilePictureUpdate({
    ...detail,
    cacheBuster: detail.cacheBuster ?? Date.now(),
  });
}
