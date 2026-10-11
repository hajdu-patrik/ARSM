/** Shared TanStack Query client and the private cache lifecycle: persisting the catalog reads for one
 * person, restoring them after a reload and clearing everything at auth boundaries. */

import { QueryClient } from '@tanstack/react-query';
import {
  persistQueryClientRestore,
  persistQueryClientSubscribe,
  type PersistedClient,
  type PersistQueryClientOptions,
} from '@tanstack/react-query-persist-client';
import { logError } from '../../utils/devLog';
import { readStorage, removeStorage, writeStorage } from '../../utils/safeStorage';
import { isRecord } from '../http/record-guard';
import {
  PERSISTED_QUERY_CACHE_BUSTER,
  PERSISTED_QUERY_CACHE_KEY,
  PERSISTED_QUERY_CACHE_MAX_AGE_MS,
  PERSISTED_QUERY_CACHE_WRITE_THROTTLE_MS,
} from './cache-policy';
import { isPersistedArsmQueryKey } from './queryKeys';

/** Shared TanStack Query client for authenticated WebUI read models. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: PERSISTED_QUERY_CACHE_MAX_AGE_MS,
      refetchOnReconnect: true,
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});

/** Synchronous session-storage persister (structurally a TanStack Persister) with a cancellable write queue. */
interface ThrottledPersister {
  readonly persistClient: (client: PersistedClient) => void;
  readonly restoreClient: () => PersistedClient | undefined;
  readonly removeClient: () => void;
  /** Drops a queued write that has not reached storage yet. */
  readonly cancelPendingWrite: () => void;
}

/** Narrows a parsed storage value to a persisted client, so a corrupt or foreign payload is never hydrated. */
function isPersistedClient(value: unknown): value is PersistedClient {
  return isRecord(value)
    && typeof value.timestamp === 'number'
    && typeof value.buster === 'string'
    && isRecord(value.clientState)
    && Array.isArray(value.clientState.queries)
    && Array.isArray(value.clientState.mutations);
}

/** Parses the stored payload, or null when it is not valid JSON of the persisted-client shape. */
function parsePersistedClient(raw: string): PersistedClient | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    return isPersistedClient(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Creates the persister: a burst of cache events costs one trailing write of the latest state per
 * throttle window, and storage failures never block live data fetching. */
function createThrottledSessionPersister(): ThrottledPersister {
  let pendingClient: PersistedClient | null = null;
  let writeTimer: ReturnType<typeof setTimeout> | null = null;

  /** Writes the queued state, if any; a serialization failure only loses this write. */
  function flushPendingWrite(): void {
    writeTimer = null;
    const client = pendingClient;
    pendingClient = null;
    if (client === null) {
      return;
    }

    try {
      writeStorage('session', PERSISTED_QUERY_CACHE_KEY, JSON.stringify(client));
    } catch (error) {
      logError('queryCache.persist', error);
    }
  }

  /** Drops the queued state and its timer. */
  function cancelPendingWrite(): void {
    if (writeTimer !== null) {
      clearTimeout(writeTimer);
      writeTimer = null;
    }

    pendingClient = null;
  }

  return {
    persistClient: (client) => {
      pendingClient = client;
      writeTimer ??= setTimeout(flushPendingWrite, PERSISTED_QUERY_CACHE_WRITE_THROTTLE_MS);
    },
    restoreClient: () => {
      const storedValue = readStorage('session', PERSISTED_QUERY_CACHE_KEY);
      if (storedValue === null) {
        return undefined;
      }

      const restoredClient = parsePersistedClient(storedValue);
      if (restoredClient === null) {
        removeStorage('session', PERSISTED_QUERY_CACHE_KEY);
        return undefined;
      }

      return restoredClient;
    },
    removeClient: () => {
      cancelPendingWrite();
      removeStorage('session', PERSISTED_QUERY_CACHE_KEY);
    },
    cancelPendingWrite,
  };
}

const privateCachePersister = createThrottledSessionPersister();

/** Persisted payloads belong to one person: the buster carries the person id, so a payload written for
 * another person (or by an older version) fails the restore check and is discarded. */
function buildPersistedCacheBuster(personId: number): string {
  return `${PERSISTED_QUERY_CACHE_BUSTER}:person-${String(personId)}`;
}

/** Restores the person's persisted catalog reads, then keeps persisting them; returns the stop function.
 * Only the non-personal catalog queries are dehydrated, and no mutation (its variables hold personal data) is. */
export function startQueryCachePersistence(personId: number): () => void {
  const persistOptions: PersistQueryClientOptions = {
    buster: buildPersistedCacheBuster(personId),
    dehydrateOptions: {
      shouldDehydrateMutation: () => false,
      shouldDehydrateQuery: (query) => query.state.status === 'success' && isPersistedArsmQueryKey(query.queryKey),
    },
    maxAge: PERSISTED_QUERY_CACHE_MAX_AGE_MS,
    persister: privateCachePersister,
    queryClient,
  };

  let isStopped = false;
  let stopSubscription: (() => void) | null = null;

  void persistQueryClientRestore(persistOptions)
    .catch((error: unknown) => {
      logError('queryCache.restore', error);
    })
    .then(() => {
      if (!isStopped) {
        stopSubscription = persistQueryClientSubscribe(persistOptions);
      }
    });

  return () => {
    isStopped = true;
    stopSubscription?.();
    privateCachePersister.cancelPendingWrite();
  };
}

/** Clears all in-memory and persisted private ARSM query data for auth-boundary transitions. */
export function clearArsmQueryCache(): void {
  queryClient.clear();
  privateCachePersister.removeClient();
  removeStorage('local', PERSISTED_QUERY_CACHE_KEY);
}
