import { profileService } from './profile.service';
import { apiClient } from '../http/api.client';
import { useAuthStore } from '../../store/auth.store';
import axios from 'axios';

export const PROFILE_PICTURE_UPDATED_EVENT = 'autoservice:profile-picture-updated';

export interface ProfilePictureUpdatedDetail {
  personId: number;
  hasProfilePicture: boolean;
  cacheBuster: number;
}

let eventSource: EventSource | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let subscriberCount = 0;
let lifecycleToken = 0;

function shouldKeepLiveUpdates(token: number): boolean {
  return token === lifecycleToken && subscriberCount > 0 && useAuthStore.getState().isAuthenticated;
}

function clearReconnectTimer(): void {
  if (reconnectTimer !== null) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function closeEventSource(): void {
  if (eventSource !== null) {
    eventSource.close();
    eventSource = null;
  }
}

function teardownConnection(invalidateLifecycle: boolean): void {
  clearReconnectTimer();
  closeEventSource();

  if (invalidateLifecycle) {
    lifecycleToken += 1;
  }
}

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

function scheduleReconnect(tokenAtSchedule: number): void {
  if (!shouldKeepLiveUpdates(tokenAtSchedule) || reconnectTimer !== null) {
    return;
  }

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (!shouldKeepLiveUpdates(tokenAtSchedule)) {
      return;
    }

    connectToProfilePictureUpdates();
  }, 2000);
}

async function refreshSessionIfPossible(tokenAtRequest: number): Promise<boolean> {
  if (!shouldKeepLiveUpdates(tokenAtRequest)) {
    return false;
  }

  try {
    await apiClient.post('/api/auth/refresh');
    return shouldKeepLiveUpdates(tokenAtRequest);
  } catch (error) {
    const refreshStatus = axios.isAxiosError(error) ? error.response?.status : undefined;

    if (refreshStatus === 401 || refreshStatus === 403) {
      useAuthStore.getState().clearAuth();
      return false;
    }

    return shouldKeepLiveUpdates(tokenAtRequest);
  }
}

function connectToProfilePictureUpdates(): void {
  if (!shouldKeepLiveUpdates(lifecycleToken) || eventSource !== null) {
    return;
  }

  const connectionToken = lifecycleToken;
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

    if (!shouldKeepLiveUpdates(connectionToken)) {
      return;
    }

    void refreshSessionIfPossible(connectionToken).then((shouldReconnect) => {
      if (shouldReconnect) {
        scheduleReconnect(connectionToken);
      }
    });
  };

  eventSource = source;
}

export function startProfilePictureLiveUpdates(): () => void {
  subscriberCount += 1;
  if (subscriberCount === 1) {
    lifecycleToken += 1;
  }

  connectToProfilePictureUpdates();

  return () => {
    subscriberCount = Math.max(0, subscriberCount - 1);
    if (subscriberCount > 0) {
      return;
    }

    teardownConnection(true);
  };
}

useAuthStore.subscribe((state, previousState) => {
  if (previousState.isAuthenticated && !state.isAuthenticated) {
    teardownConnection(true);
    return;
  }

  if (!previousState.isAuthenticated && state.isAuthenticated && subscriberCount > 0) {
    lifecycleToken += 1;
    connectToProfilePictureUpdates();
  }
});

export function emitProfilePictureUpdated(detail: Omit<ProfilePictureUpdatedDetail, 'cacheBuster'> & { cacheBuster?: number }): void {
  dispatchProfilePictureUpdate({
    ...detail,
    cacheBuster: detail.cacheBuster ?? Date.now(),
  });
}
