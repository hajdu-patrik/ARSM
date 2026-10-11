/** Route guard for public-only pages (e.g. login): redirects already-authenticated users to `/`. */
import { memo, type ReactNode } from 'react';
import { Navigate } from 'react-router';
import { useAuthStore } from '../store/auth.store';
import { APP_ROUTE_PATHS } from './appRoutes';

/** Props for the {@link PublicOnlyRoute} component. */
interface PublicOnlyRouteProps {
  /** Public content rendered only when the user is not authenticated. */
  readonly children: ReactNode;
}

/** Route guard that redirects authenticated users to `/`, showing content only for unauthenticated visitors. */
const PublicOnlyRouteComponent = memo(function PublicOnlyRoute({ children }: PublicOnlyRouteProps) {
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

PublicOnlyRouteComponent.displayName = 'PublicOnlyRoute';

export const PublicOnlyRoute = PublicOnlyRouteComponent;
