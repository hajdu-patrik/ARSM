/**
 * Route guard for public-only pages (e.g. login). Redirects already-authenticated
 * users to `/` and renders nothing while auth state is loading.
 * @module PublicOnlyRoute
 */
import { memo } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';

/** Props for the {@link PublicOnlyRoute} component. */
interface PublicOnlyRouteProps {
  /** Public content rendered only when the user is not authenticated. */
  readonly children: React.ReactNode;
}

/** Route guard that redirects authenticated users to `/`, showing content only for unauthenticated visitors. */
const PublicOnlyRouteComponent = memo(function PublicOnlyRoute({ children }: PublicOnlyRouteProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);

  if (isLoading) {
    return null;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
});

PublicOnlyRouteComponent.displayName = 'PublicOnlyRoute';

export const PublicOnlyRoute = PublicOnlyRouteComponent;
