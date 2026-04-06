import { memo } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';

interface AdminRouteProps {
  readonly children: React.ReactNode;
}

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
