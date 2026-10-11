/** Route guard for admin-only pages: redirects unauthenticated users to `/login`, non-admin to `/`. */
import { memo, type ReactNode } from 'react';
import { Navigate } from 'react-router';
import { useAuthStore } from '../store/auth.store';
import { APP_ROUTE_PATHS } from './appRoutes';

/** Props for the {@link AdminRoute} component. */
interface AdminRouteProps {
  /** Admin-only content rendered when the user is both authenticated and an admin. */
  readonly children: ReactNode;
}

/** Route guard that enforces admin access: redirects to `/login` if unauthenticated, to `/` if not admin. */
const AdminRouteComponent = memo(function AdminRoute({ children }: AdminRouteProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const isAdmin = useAuthStore((state) => state.user?.isAdmin);

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to={APP_ROUTE_PATHS.login} replace />;
  }

  if (!isAdmin) {
    return <Navigate to={APP_ROUTE_PATHS.scheduler} replace />;
  }

  return <>{children}</>;
});

AdminRouteComponent.displayName = 'AdminRoute';

export const AdminRoute = AdminRouteComponent;
