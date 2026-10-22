/** Route guard of the change-password page: signed-out visitors go to `/login`, users without a temporary password to `/`. */
import { memo, type ReactNode } from 'react';
import { Navigate } from 'react-router';
import { useAuthStore } from '../store/auth.store';
import { APP_ROUTE_PATHS } from './appRoutes';

interface PasswordChangeRouteProps {
  readonly children: ReactNode;
}

export const PasswordChangeRoute = memo(function PasswordChangeRoute({ children }: PasswordChangeRouteProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const mustChangePassword = useAuthStore((state) => state.user?.mustChangePassword);

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to={APP_ROUTE_PATHS.login} replace />;
  }

  if (!mustChangePassword) {
    return <Navigate to={APP_ROUTE_PATHS.scheduler} replace />;
  }

  return <>{children}</>;
});
