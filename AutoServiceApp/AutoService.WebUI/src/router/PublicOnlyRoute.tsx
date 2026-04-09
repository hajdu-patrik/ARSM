import { memo } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';

interface PublicOnlyRouteProps {
  readonly children: React.ReactNode;
}

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