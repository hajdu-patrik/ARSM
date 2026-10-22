/** Route guard for authenticated pages: sends unauthenticated users to `/login` and users who still have a
 * temporary password to `/change-password`. */
import { memo, type ReactNode } from 'react';
import { Navigate } from 'react-router';
import { useAuthStore } from '../store/auth.store';
import { APP_ROUTE_PATHS } from './appRoutes';

/** Props for the {@link PrivateRoute} component. */
interface PrivateRouteProps {
  /** Protected content rendered only when the user is authenticated and has no temporary password. */
  readonly children: ReactNode;
}

/** Route guard that redirects to `/login` when the user is not authenticated and to `/change-password` while the password is temporary. */
export const PrivateRoute = memo(function PrivateRoute({ children }: PrivateRouteProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const mustChangePassword = useAuthStore((state) => state.user?.mustChangePassword);

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to={APP_ROUTE_PATHS.login} replace />;
  }

  if (mustChangePassword) {
    return <Navigate to={APP_ROUTE_PATHS.changePassword} replace />;
  }

  return <>{children}</>;
});
