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

const Login = lazy(() => import('./pages/Login/page').then(m => ({ default: m.Login })));
const SchedulerPage = lazy(() => import('./pages/Scheduler/page').then(m => ({ default: m.SchedulerPage })));
const ToolsPage = lazy(() => import('./pages/Tools/page').then(m => ({ default: m.ToolsPage })));
const InventoryPage = lazy(() => import('./pages/Inventory/page').then(m => ({ default: m.InventoryPage })));
const NotFound = lazy(() => import('./pages/NotFound').then(m => ({ default: m.NotFound })));
const RegisterMechanicPage = lazy(() => import('./pages/Admin/RegisterMechanic/page').then(m => ({ default: m.RegisterMechanicPage })));
const SettingsPage = lazy(() => import('./pages/Settings/page').then(m => ({ default: m.SettingsPage })));

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

          {/* Admin Routes */}
          <Route path="/admin/register" element={<AdminRoute><SidebarLayout><RegisterMechanicPage /></SidebarLayout></AdminRoute>} />

          {/* Placeholder Routes (Protected) */}
          <Route path="/tools" element={<PrivateRoute><SidebarLayout><ToolsPage /></SidebarLayout></PrivateRoute>} />
          <Route path="/inventory" element={<PrivateRoute><SidebarLayout><InventoryPage /></SidebarLayout></PrivateRoute>} />
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
