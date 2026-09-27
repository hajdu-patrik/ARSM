/**
 * Reusable server-sent event channel with auth-aware reconnect.
 *
 * Every live channel needs the same connection lifecycle: reference-counted subscribers, a
 * lifecycle token so a stale reconnect cannot resurrect a torn-down connection, a session refresh
 * before reconnecting, and teardown on logout. That logic lives here once; a channel only supplies
 * its URL, its SSE event name, the browser event it re-dispatches, and a parser.
 * @module services/live/live-update-channel
 */

import axios from 'axios';
import { apiClient } from '../http/api.client';
import { useAuthStore } from '../../store/auth.store';

/** Delay before a reconnect attempt after the stream drops. */
const RECONNECT_DELAY_MS = 2000;

/** Configuration for one live update channel. */
export interface LiveUpdateChannelOptions<TDetail> {
  /** Resolves the SSE endpoint URL. Lazy, because it depends on runtime configuration. */
  readonly resolveUrl: () => string;
  /** Event name the server writes in its SSE frames. */
  readonly sseEventName: string;
  /** Custom DOM event name this channel re-dispatches on `window`. */
  readonly domEventName: string;
  /** Validates and narrows a raw SSE payload; return null to drop malformed frames. */
  readonly parse: (data: string) => TDetail | null;
}

/** Public surface of a live update channel. */
export interface LiveUpdateChannel<TDetail> {
  /** Starts the connection on the first subscriber; the returned function releases this subscriber. */
  readonly start: () => () => void;
  /** Dispatches a detail on the DOM event, bypassing the network (used after local mutations). */
  readonly dispatch: (detail: TDetail) => void;
}

/**
 * Creates an SSE-backed live update channel.
 *
 * @param options - Channel-specific URL, event names, and payload parser.
 * @returns The channel's start and dispatch functions.
 */
export function createLiveUpdateChannel<TDetail>(
  options: LiveUpdateChannelOptions<TDetail>,
): LiveUpdateChannel<TDetail> {
  let eventSource: EventSource | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let subscriberCount = 0;
  let lifecycleToken = 0;

  /** Whether the connection is still wanted for the given lifecycle token. */
  function shouldKeepLiveUpdates(token: number): boolean {
    return token === lifecycleToken && subscriberCount > 0 && useAuthStore.getState().isAuthenticated;
  }

  /** Cancels a pending reconnect timer. */
  function clearReconnectTimer(): void {
    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  }

  /** Closes the active connection if one exists. */
  function closeEventSource(): void {
    if (eventSource !== null) {
      eventSource.close();
      eventSource = null;
    }
  }

  /**
   * Tears down the connection and timers.
   * @param invalidateLifecycle - Whether to invalidate in-flight reconnect attempts.
   */
  function teardownConnection(invalidateLifecycle: boolean): void {
    clearReconnectTimer();
    closeEventSource();

    if (invalidateLifecycle) {
      lifecycleToken += 1;
    }
  }

  /** Re-dispatches a parsed detail as a DOM custom event. */
  function dispatch(detail: TDetail): void {
    globalThis.dispatchEvent(new CustomEvent(options.domEventName, { detail }));
  }

  /** Schedules a reconnect if the connection is still wanted. */
  function scheduleReconnect(tokenAtSchedule: number): void {
    if (!shouldKeepLiveUpdates(tokenAtSchedule) || reconnectTimer !== null) {
      return;
    }

    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      if (shouldKeepLiveUpdates(tokenAtSchedule)) {
        connect();
      }
    }, RECONNECT_DELAY_MS);
  }

  /**
   * Refreshes the session before reconnecting, clearing auth on a definitive rejection.
   * @param tokenAtRequest - Lifecycle token captured before the request.
   * @returns Whether reconnecting should proceed.
   */
  async function refreshSessionIfPossible(tokenAtRequest: number): Promise<boolean> {
    if (!shouldKeepLiveUpdates(tokenAtRequest)) {
      return false;
    }

    try {
      await apiClient.post('/api/auth/refresh', undefined, { skipErrorRedirect: true });
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

  /** Opens the SSE connection and wires event and error handling. */
  function connect(): void {
    if (!shouldKeepLiveUpdates(lifecycleToken) || eventSource !== null) {
      return;
    }

    const connectionToken = lifecycleToken;
    const source = new EventSource(options.resolveUrl(), { withCredentials: true });

    source.addEventListener(options.sseEventName, (event) => {
      const detail = options.parse((event as MessageEvent<string>).data);
      if (detail) {
        dispatch(detail);
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

  useAuthStore.subscribe((state, previousState) => {
    if (previousState.isAuthenticated && !state.isAuthenticated) {
      teardownConnection(true);
      return;
    }

    if (!previousState.isAuthenticated && state.isAuthenticated && subscriberCount > 0) {
      lifecycleToken += 1;
      connect();
    }
  });

  return {
    start(): () => void {
      subscriberCount += 1;
      if (subscriberCount === 1) {
        lifecycleToken += 1;
      }

      connect();

      return () => {
        subscriberCount = Math.max(0, subscriberCount - 1);
        if (subscriberCount === 0) {
          teardownConnection(true);
        }
      };
    },
    dispatch,
  };
}
