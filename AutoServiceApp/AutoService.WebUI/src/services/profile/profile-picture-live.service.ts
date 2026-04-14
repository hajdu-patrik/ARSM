/**
 * Real-time profile picture update service.
 *
 * Establishes an SSE connection to {@code /api/profile/picture/updates}
 * and dispatches {@code autoservice:profile-picture-updated} custom events
 * for consumers (sidebar avatar, scheduler mechanic avatars) to react to.
 * Features auth-aware reconnect with session refresh, lifecycle-token
 * guarded teardown, and reference-counted subscriber management.
 * @module services/profile/profile-picture-live.service
 */

import { profileService } from './profile.service';
import { apiClient } from '../http/api.client';
import { useAuthStore } from '../../store/auth.store';
import axios from 'axios';

/** Custom event name dispatched on profile picture changes. */
export const PROFILE_PICTURE_UPDATED_EVENT = 'autoservice:profile-picture-updated';

/**
 * Detail payload for the {@code autoservice:profile-picture-updated} custom event.
 */
export interface ProfilePictureUpdatedDetail {
  /** Person ID whose profile picture changed. */
  personId: number;
  /** Whether the person currently has a profile picture. */
  hasProfilePicture: boolean;
  /** Cache-busting timestamp to force image reload. */
  cacheBuster: number;
}

/** Active SSE connection, or {@code null} when disconnected. */
let eventSource: EventSource | null = null;
/** Pending reconnect timer handle. */
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
/** Number of active subscribers to the live update channel. */
let subscriberCount = 0;
/** Monotonically increasing token to invalidate stale connection attempts. */
let lifecycleToken = 0;

/**
 * Determines whether the live update connection should be maintained.
 * @param token - The lifecycle token at the time of the check.
 * @returns {@code true} if the token is current, subscribers exist, and user is authenticated.
 */
function shouldKeepLiveUpdates(token: number): boolean {
  return token === lifecycleToken && subscriberCount > 0 && useAuthStore.getState().isAuthenticated;
}

/** Cancels any pending reconnect timer. */
function clearReconnectTimer(): void {
  if (reconnectTimer !== null) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

/** Closes the active SSE connection if one exists. */
function closeEventSource(): void {
  if (eventSource !== null) {
    eventSource.close();
    eventSource = null;
  }
}

/**
 * Tears down the SSE connection and timers, optionally invalidating
 * the lifecycle token to prevent stale reconnect attempts.
 * @param invalidateLifecycle - Whether to increment the lifecycle token.
 */
function teardownConnection(invalidateLifecycle: boolean): void {
  clearReconnectTimer();
  closeEventSource();

  if (invalidateLifecycle) {
    lifecycleToken += 1;
  }
}

/**
 * Dispatches a {@code CustomEvent} on the global window with profile picture update details.
 * @param detail - The update payload to broadcast.
 */
function dispatchProfilePictureUpdate(detail: ProfilePictureUpdatedDetail): void {
  globalThis.dispatchEvent(new CustomEvent(PROFILE_PICTURE_UPDATED_EVENT, { detail }));
}

/**
 * Parses a raw SSE data string into a typed profile picture update detail.
 * @param data - The raw JSON string from the SSE message.
 * @returns Parsed detail, or {@code null} if the data is invalid.
 */
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

/**
 * Schedules a reconnect attempt after a 2-second delay if the connection is still needed.
 * @param tokenAtSchedule - The lifecycle token at the time of scheduling.
 */
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

/**
 * Attempts to refresh the auth session before reconnecting the SSE stream.
 * Clears auth state on {@code 401/403} refresh failure (session expiry).
 * @param tokenAtRequest - The lifecycle token at the time of the request.
 * @returns {@code true} if the session was refreshed and reconnect should proceed.
 */
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

/**
 * Opens a new SSE connection to the profile picture updates endpoint.
 * Listens for {@code profile-picture-updated} events and dispatches them
 * as global custom events. Handles errors with auth-aware reconnect logic.
 */
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

/**
 * Subscribes to real-time profile picture updates. Starts the SSE
 * connection on the first subscriber and tears it down when the last
 * subscriber unsubscribes.
 * @returns An unsubscribe function that decrements the subscriber count.
 */
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

/**
 * Manually emits a profile picture updated event (e.g., after a local upload/delete).
 * Auto-generates a cache-buster timestamp if not provided.
 * @param detail - The update detail with optional cache-buster override.
 */
export function emitProfilePictureUpdated(detail: Omit<ProfilePictureUpdatedDetail, 'cacheBuster'> & { cacheBuster?: number }): void {
  dispatchProfilePictureUpdate({
    ...detail,
    cacheBuster: detail.cacheBuster ?? Date.now(),
  });
}
