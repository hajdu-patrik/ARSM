/**
 * Route guard for authenticated pages. Redirects unauthenticated
 * users to `/login` and renders nothing while auth state is loading.
 * @module PrivateRoute
 */
import { memo } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';

/** Props for the {@link PrivateRoute} component. */
interface PrivateRouteProps {
  /** Protected content rendered only when the user is authenticated. */
  readonly children: React.ReactNode;
}

/** Route guard that redirects to `/login` when the user is not authenticated. */
const PrivateRouteComponent = memo(function PrivateRoute({ children }: PrivateRouteProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
});

PrivateRouteComponent.displayName = 'PrivateRoute';

export const PrivateRoute = PrivateRouteComponent;
