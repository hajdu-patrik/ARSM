/** React provider that persists private query data for reload-safe cache hits. */

import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider, type PersistedClient, type Persister } from '@tanstack/react-query-persist-client';
import {
  PERSISTED_QUERY_CACHE_BUSTER,
  PERSISTED_QUERY_CACHE_KEY,
  PERSISTED_QUERY_CACHE_MAX_AGE_MS,
} from './cache-policy';
import { queryClient } from './queryClient';
import { isPrivateArsmQueryKey } from './queryKeys';

interface QueryCacheProviderProps {
  readonly children: ReactNode;
}

/**
 * Safely resolves session storage for browsers that block storage access in privacy modes.
 * @returns Session storage when available, otherwise {@code null}.
 */
function getSessionStorage(): Storage | null {
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
}

/**
 * Creates a TanStack Query persister backed by the provided browser storage bucket.
 * @param storage Storage implementation used for persisted query data.
 * @param key Storage key for the serialized persisted client.
 * @returns A best-effort persister that never blocks live API reads on storage failures.
 */
function createStoragePersister(storage: Storage, key: string): Persister {
  return {
    persistClient: (persistedClient: PersistedClient) => {
      try {
        storage.setItem(key, JSON.stringify(persistedClient));
      } catch {
        // Storage quota or privacy-mode failures should not block live data fetching.
      }
    },
    removeClient: () => {
      try {
        storage.removeItem(key);
      } catch {
        // Storage cleanup is best-effort; auth cleanup also clears the in-memory query cache.
      }
    },
    restoreClient: () => {
      let cachedValue: string | null;
      try {
        cachedValue = storage.getItem(key);
      } catch {
        return undefined;
      }

      if (!cachedValue) {
        return undefined;
      }

      try {
        return JSON.parse(cachedValue) as PersistedClient;
      } catch {
        try {
          storage.removeItem(key);
        } catch {
          // Ignore cleanup failure after a corrupt cached value.
        }
        return undefined;
      }
    },
  };
}

const sessionStoragePersister = (() => {
  const storage = getSessionStorage();
  if (!storage) {
    return null;
  }

  return createStoragePersister(storage, PERSISTED_QUERY_CACHE_KEY);
})();

/**
 * Provides the shared query client and enables persisted private query data when session storage is usable.
 * @param props Provider props containing the React subtree.
 * @returns The query-provider wrapper for the app root.
 */
export function QueryCacheProvider({ children }: QueryCacheProviderProps) {
  if (!sessionStoragePersister) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        buster: PERSISTED_QUERY_CACHE_BUSTER,
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => query.state.status === 'success' && isPrivateArsmQueryKey(query.queryKey),
        },
        maxAge: PERSISTED_QUERY_CACHE_MAX_AGE_MS,
        persister: sessionStoragePersister,
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
