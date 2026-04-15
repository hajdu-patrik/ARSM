/**
 * Route guard for admin-only pages. Redirects unauthenticated users
 * to `/login` and non-admin users to `/`. Renders nothing while loading.
 * @module AdminRoute
 */
import { memo } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';

/** Props for the {@link AdminRoute} component. */
interface AdminRouteProps {
  /** Admin-only content rendered when the user is both authenticated and an admin. */
  readonly children: React.ReactNode;
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
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
});

AdminRouteComponent.displayName = 'AdminRoute';

export const AdminRoute = AdminRouteComponent;
