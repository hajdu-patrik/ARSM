/** Hook that exposes the signed-in person scope for query keys, or null while nobody is signed in. */

import { useMemo } from 'react';
import { useAuthStore } from '../../store/auth.store';
import { getAuthQueryScope, type AuthQueryScope } from '../cache/queryKeys';

/** Returns a stable query scope for the current user; it changes only when the person or the role does. */
export function useAuthQueryScope(): AuthQueryScope | null {
  const personId = useAuthStore((state) => state.user?.personId);
  const isAdmin = useAuthStore((state) => state.user?.isAdmin);

  return useMemo(
    () => (personId === undefined || isAdmin === undefined ? null : getAuthQueryScope({ personId, isAdmin })),
    [personId, isAdmin],
  );
}
