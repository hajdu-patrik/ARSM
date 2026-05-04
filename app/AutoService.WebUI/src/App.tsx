/**
 * Root application component. Configures routing, lazy-loaded pages,
 * auth session restoration, error boundaries, SEO management, and the
 * global toast viewport.
 * @module App
 */
import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth.store';
import { authService } from './services/auth/auth.service';
import { LoadingPage } from './pages/LoadingPage';
import { PrivateRoute } from './router/PrivateRoute';
import { AdminRoute } from './router/AdminRoute';
import { PublicOnlyRoute } from './router/PublicOnlyRoute';
import { SidebarLayout } from './components/layout/SidebarLayout';
import { ToastViewport } from './components/common/ToastViewport';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { SeoManager } from './components/seo/SeoManager';
import './utils/i18n';

const Login = lazy(() => import('./pages/Login/page').then(moduleExports => ({ default: moduleExports.Login })));
const SchedulerPage = lazy(() => import('./pages/Scheduler/page').then(moduleExports => ({ default: moduleExports.SchedulerPage })));
const CustomersPage = lazy(() => import('./pages/Customers/page').then(moduleExports => ({ default: moduleExports.CustomersPage })));
const NotFound = lazy(() => import('./pages/NotFound').then(moduleExports => ({ default: moduleExports.NotFound })));
const RegisterMechanicPage = lazy(() => import('./pages/Admin/RegisterMechanic/page').then(moduleExports => ({ default: moduleExports.RegisterMechanicPage })));
const SettingsPage = lazy(() => import('./pages/Settings/page').then(moduleExports => ({ default: moduleExports.SettingsPage })));

/** Root component that wires routing, auth restoration, SEO, error boundary, and toast system. */
function App() {
  const setIsAuthenticated = useAuthStore((state) => state.setIsAuthenticated);
  const setIsLoading = useAuthStore((state) => state.setIsLoading);

  const schedulerElement = (
    <PrivateRoute>
      <SidebarLayout>
        <SchedulerPage />
      </SidebarLayout>
    </PrivateRoute>
  );

  useEffect(() => {
    let isCancelled = false;

    const restoreAuthState = async () => {
      setIsLoading(true);

      try {
        const user = await authService.restoreAuth();
        if (!isCancelled) {
          setIsAuthenticated(!!user);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void restoreAuthState();

    return () => {
      isCancelled = true;
    };
  }, [setIsAuthenticated, setIsLoading]);

  return (
    <>
      {/* Show loading page on first app load */}
      <LoadingPage />

      {/* Main app */}
      <ErrorBoundary>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <SeoManager />

        <Suspense fallback={null}>
        <Routes>
          {/* Login Route */}
          <Route
            path="/login"
            element={(
              <PublicOnlyRoute>
                <Login />
              </PublicOnlyRoute>
            )}
          />

          {/* Scheduler Route (Protected) */}
          <Route path="/" element={schedulerElement} />
          <Route path="/scheduler" element={<Navigate to="/" replace />} />
          <Route path="/dashboard" element={<Navigate to="/" replace />} />
          <Route path="/customers" element={<PrivateRoute><SidebarLayout><CustomersPage /></SidebarLayout></PrivateRoute>} />

          {/* Admin Routes */}
          <Route path="/admin/register" element={<AdminRoute><SidebarLayout><RegisterMechanicPage /></SidebarLayout></AdminRoute>} />

          <Route path="/settings" element={<PrivateRoute><SidebarLayout><SettingsPage /></SidebarLayout></PrivateRoute>} />

          {/* 404 Not Found */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
      </Router>
      </ErrorBoundary>

      <ToastViewport />
    </>
  );
}

export default App;
