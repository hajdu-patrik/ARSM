/** Route guard for authenticated pages: redirects unauthenticated users to `/login`. */
import { memo, type ReactNode } from 'react';
import { Navigate } from 'react-router';
import { useAuthStore } from '../store/auth.store';
import { APP_ROUTE_PATHS } from './appRoutes';

/** Props for the {@link PrivateRoute} component. */
interface PrivateRouteProps {
  /** Protected content rendered only when the user is authenticated. */
  readonly children: ReactNode;
}

/** Route guard that redirects to `/login` when the user is not authenticated. */
export const PrivateRoute = memo(function PrivateRoute({ children }: PrivateRouteProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to={APP_ROUTE_PATHS.login} replace />;
  }

  return <>{children}</>;
});
