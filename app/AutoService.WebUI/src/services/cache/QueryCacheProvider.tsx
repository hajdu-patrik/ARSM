/** React provider for the shared query client; it persists the non-personal catalog reads for the
 * signed-in person only, so a reload keeps them and nobody else's data is ever restored. */

import { useEffect, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../../store/auth.store';
import { queryClient, startQueryCachePersistence } from './queryClient';

interface QueryCacheProviderProps {
  readonly children: ReactNode;
}

/** Provides the shared query client; persistence starts once a person is known and stops at logout. */
export function QueryCacheProvider({ children }: QueryCacheProviderProps) {
  const personId = useAuthStore((state) => state.user?.personId ?? null);

  useEffect(() => {
    if (personId === null) {
      return undefined;
    }

    return startQueryCachePersistence(personId);
  }, [personId]);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
