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
import { ServerError } from './pages/ServerError';
import { warmErrorIllustrationCache } from './utils/errorIllustrationCache';
import './utils/i18n';

const Login = lazy(() => import('./pages/Login/page').then((module) => ({ default: module.Login })));
const SchedulerPage = lazy(() => import('./pages/Scheduler/page').then((module) => ({ default: module.SchedulerPage })));
const CustomersPage = lazy(() => import('./pages/Customers/page').then((module) => ({ default: module.CustomersPage })));
const NotFound = lazy(() => import('./pages/NotFound').then((module) => ({ default: module.NotFound })));
const RegisterMechanicPage = lazy(() => import('./pages/Admin/RegisterMechanic/page').then((module) => ({ default: module.RegisterMechanicPage })));
const SettingsPage = lazy(() => import('./pages/Settings/page').then((module) => ({ default: module.SettingsPage })));

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

  const customersElement = (
    <PrivateRoute>
      <SidebarLayout>
        <CustomersPage />
      </SidebarLayout>
    </PrivateRoute>
  );

  const registerMechanicElement = (
    <AdminRoute>
      <SidebarLayout>
        <RegisterMechanicPage />
      </SidebarLayout>
    </AdminRoute>
  );

  const settingsElement = (
    <PrivateRoute>
      <SidebarLayout>
        <SettingsPage />
      </SidebarLayout>
    </PrivateRoute>
  );

  useEffect(() => {
    let isUnmounted = false;

    warmErrorIllustrationCache();

    const restoreAuthState = async () => {
      setIsLoading(true);

      try {
        const user = await authService.restoreAuth();
        if (!isUnmounted) {
          setIsAuthenticated(!!user);
        }
      } finally {
        if (!isUnmounted) {
          setIsLoading(false);
        }
      }
    };

    void restoreAuthState();

    return () => {
      isUnmounted = true;
    };
  }, [setIsAuthenticated, setIsLoading]);

  return (
    <>
      {/* Show loading page on full browser reload for app routes */}
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
              <Route path="/customers" element={customersElement} />

              {/* Admin Routes */}
              <Route path="/admin/register" element={registerMechanicElement} />

              <Route path="/settings" element={settingsElement} />

              {/* Server Error */}
              <Route path="/500" element={<ServerError />} />

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
