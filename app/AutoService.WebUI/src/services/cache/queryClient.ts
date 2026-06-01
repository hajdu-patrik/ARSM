/** Shared TanStack Query client and private cache lifecycle helpers. */

import { QueryClient } from '@tanstack/react-query';
import {
  PERSISTED_QUERY_CACHE_KEY,
  PERSISTED_QUERY_CACHE_MAX_AGE_MS,
} from './cache-policy';

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

/**
 * Removes persisted query data from one browser storage bucket when that bucket is available.
 * @param storage Storage bucket to clear, or {@code null} when unavailable.
 */
function removePersistedCacheFromStorage(storage: Storage | null): void {
  if (!storage) {
    return;
  }

  try {
    storage.removeItem(PERSISTED_QUERY_CACHE_KEY);
  } catch {
    // Ignore storage failures so auth cleanup can still complete.
  }
}

/**
 * Safely resolves browser storage because privacy modes can throw on storage access.
 * @param kind Browser storage kind to resolve.
 * @returns The requested storage bucket, or {@code null} when unavailable.
 */
function getBrowserStorage(kind: 'localStorage' | 'sessionStorage'): Storage | null {
  try {
    return globalThis[kind] ?? null;
  } catch {
    return null;
  }
}

/** Clears all in-memory and persisted private ARSM query data for auth-boundary transitions. */
export function clearArsmQueryCache(): void {
  queryClient.clear();
  removePersistedCacheFromStorage(getBrowserStorage('sessionStorage'));
  removePersistedCacheFromStorage(getBrowserStorage('localStorage'));
}
