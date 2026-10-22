/** Route guard for public-only pages (e.g. login): redirects already-authenticated users to `/`. */
import { memo, type ReactNode } from 'react';
import { Navigate } from 'react-router';
import { useAuthStore } from '../store/auth.store';
import { APP_ROUTE_PATHS } from './appRoutes';

interface PublicOnlyRouteProps {
  readonly children: ReactNode;
}

export const PublicOnlyRoute = memo(function PublicOnlyRoute({ children }: PublicOnlyRouteProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);

  if (isLoading) {
    return null;
  }

  if (isAuthenticated) {
    return <Navigate to={APP_ROUTE_PATHS.scheduler} replace />;
  }

  return <>{children}</>;
});
