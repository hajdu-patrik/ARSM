/** Reusable SSE channel: ref-counted subscribers, lifecycle-token reconnect with exponential backoff and
 * logout teardown (see WebUI CLAUDE.md); a channel only supplies its URL, SSE event, DOM event and parser. */

import axios from 'axios';
import { apiClient } from '../http/api.client';
import { isRecord } from '../http/record-guard';
import { useAuthStore } from '../../store/auth.store';

/** Nominal delay before the first reconnect attempt; it doubles with every further failed attempt. */
const RECONNECT_BASE_DELAY_MS = 2000;

/** Upper bound of the reconnect delay, reached after a few failed attempts. */
const RECONNECT_MAX_DELAY_MS = 30_000;

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

/** Parses an SSE frame payload as a JSON object, or null when it is malformed or not an object. */
export function parseJsonObject(data: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(data);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Delay before the reconnect attempt with the given 0-based number: the nominal 2 s, 4 s, ... up to 30 s,
 * of which the upper half is random jitter so many clients do not retry in lockstep. */
function reconnectDelayMs(attempt: number): number {
  const nominalMs = Math.min(RECONNECT_MAX_DELAY_MS, RECONNECT_BASE_DELAY_MS * 2 ** attempt);
  return nominalMs / 2 + Math.random() * (nominalMs / 2);
}

/** Creates an SSE-backed live update channel from its URL, event names and payload parser. */
export function createLiveUpdateChannel<TDetail>(
  options: LiveUpdateChannelOptions<TDetail>,
): LiveUpdateChannel<TDetail> {
  let eventSource: EventSource | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let reconnectAttempt = 0;
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

  /** Tears down the connection and timers, optionally invalidating in-flight reconnect attempts. */
  function teardownConnection(invalidateLifecycle: boolean): void {
    clearReconnectTimer();
    closeEventSource();

    if (invalidateLifecycle) {
      lifecycleToken += 1;
      reconnectAttempt = 0;
    }
  }

  /** Re-dispatches a parsed detail as a DOM custom event. */
  function dispatch(detail: TDetail): void {
    globalThis.dispatchEvent(new CustomEvent(options.domEventName, { detail }));
  }

  /** Schedules a backed-off reconnect if the connection is still wanted. */
  function scheduleReconnect(tokenAtSchedule: number): void {
    if (!shouldKeepLiveUpdates(tokenAtSchedule) || reconnectTimer !== null) {
      return;
    }

    const delayMs = reconnectDelayMs(reconnectAttempt);
    reconnectAttempt += 1;

    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      if (shouldKeepLiveUpdates(tokenAtSchedule)) {
        connect();
      }
    }, delayMs);
  }

  /** Refreshes the session before reconnecting, clearing auth on a definitive rejection. */
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

  /** A stream the browser already closed was rejected by the server (maybe an expired session), so refresh
   * first; a merely dropped or unreachable stream reconnects with backoff. */
  function handleStreamError(source: EventSource, connectionToken: number): void {
    const wasRejectedByServer = source.readyState === source.CLOSED;
    source.close();
    if (eventSource === source) {
      eventSource = null;
    }

    if (!shouldKeepLiveUpdates(connectionToken)) {
      return;
    }

    if (!wasRejectedByServer) {
      scheduleReconnect(connectionToken);
      return;
    }

    void refreshSessionIfPossible(connectionToken).then((shouldReconnect) => {
      if (shouldReconnect) {
        scheduleReconnect(connectionToken);
      }
    });
  }

  /** Opens the SSE connection and wires event and error handling. */
  function connect(): void {
    if (!shouldKeepLiveUpdates(lifecycleToken) || eventSource !== null) {
      return;
    }

    const connectionToken = lifecycleToken;
    const source = new EventSource(options.resolveUrl(), { withCredentials: true });

    source.addEventListener(options.sseEventName, (event) => {
      if (typeof event.data !== 'string') {
        return;
      }

      const detail = options.parse(event.data);
      if (detail !== null) {
        dispatch(detail);
      }
    });

    source.onopen = () => {
      reconnectAttempt = 0;
    };

    source.onerror = () => {
      handleStreamError(source, connectionToken);
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
