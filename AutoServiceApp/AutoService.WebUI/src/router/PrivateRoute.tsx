import { memo } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';

interface PrivateRouteProps {
  readonly children: React.ReactNode;
}

const PrivateRouteComponent = memo(function PrivateRoute({ children }: PrivateRouteProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
});

PrivateRouteComponent.displayName = 'PrivateRoute';

export const PrivateRoute = PrivateRouteComponent;
