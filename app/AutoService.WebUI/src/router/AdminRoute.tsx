/** Route guard for admin-only pages: the private-route checks, then non-admins go to `/`. */
import { memo, type ReactNode } from 'react';
import { Navigate } from 'react-router';
import { useAuthStore } from '../store/auth.store';
import { APP_ROUTE_PATHS } from './appRoutes';
import { PrivateRoute } from './PrivateRoute';

interface AdminRouteProps {
  readonly children: ReactNode;
}

export const AdminRoute = memo(function AdminRoute({ children }: AdminRouteProps) {
  const isAdmin = useAuthStore((state) => state.user?.isAdmin);

  return (
    <PrivateRoute>
      {isAdmin ? children : <Navigate to={APP_ROUTE_PATHS.scheduler} replace />}
    </PrivateRoute>
  );
});
