/** Root application component: routing, lazy-loaded pages, auth restoration,
 * error boundaries, SEO, the inert-while-modal app shell and the global toast viewport. */
import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router';
import { useAuthStore } from './store/auth.store';
import { authService } from './services/auth/auth.service';
import { LoadingPage } from './pages/LoadingPage';
import { PrivateRoute } from './router/PrivateRoute';
import { AdminRoute } from './router/AdminRoute';
import { PasswordChangeRoute } from './router/PasswordChangeRoute';
import { PublicOnlyRoute } from './router/PublicOnlyRoute';
import { APP_ROUTE_PATHS } from './router/appRoutes';
import { SidebarLayout } from './components/layout/SidebarLayout';
import { registerAppShell } from './components/common/modalStack';
import { ToastViewport } from './components/common/ToastViewport';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { SeoManager } from './components/seo/SeoManager';
import { ServerError } from './pages/ServerError';
import { NotFound } from './pages/NotFound';
import { warmErrorIllustrationCache } from './utils/errorIllustrationCache';
import { centeredLoadingWrapperClass, loadingSpinnerClass } from './utils/formStyles';

const Login = lazy(() => import('./pages/Login/page').then((module) => ({ default: module.Login })));
const ChangePasswordPage = lazy(() => import('./pages/ChangePassword/page').then((module) => ({ default: module.ChangePasswordPage })));
const SchedulerPage = lazy(() => import('./pages/Scheduler/page').then((module) => ({ default: module.SchedulerPage })));
const CustomersPage = lazy(() => import('./pages/Customers/page').then((module) => ({ default: module.CustomersPage })));
const InventoryPage = lazy(() => import('./pages/Inventory/page').then((module) => ({ default: module.InventoryPage })));
const QuotesPage = lazy(() => import('./pages/Quotes/page').then((module) => ({ default: module.QuotesPage })));
const CompanyResultsPage = lazy(() => import('./pages/CompanyResults/page').then((module) => ({ default: module.CompanyResultsPage })));
const RegisterMechanicPage = lazy(() => import('./pages/Admin/RegisterMechanic/page').then((module) => ({ default: module.RegisterMechanicPage })));
const SettingsPage = lazy(() => import('./pages/Settings/page').then((module) => ({ default: module.SettingsPage })));

/** Shown while a lazy page chunk loads: the centered spinner the list sections show while their data loads. */
const ROUTE_LOADING_FALLBACK = (
  <div role="status" className={centeredLoadingWrapperClass}>
    <div className={`h-8 w-8 ${loadingSpinnerClass}`} />
  </div>
);

/** A page behind the sign-in guard, inside the sidebar layout. */
function privatePage(page: ReactNode): ReactNode {
  return (
    <PrivateRoute>
      <SidebarLayout>{page}</SidebarLayout>
    </PrivateRoute>
  );
}

/** A page for admins only, inside the sidebar layout. */
function adminPage(page: ReactNode): ReactNode {
  return (
    <AdminRoute>
      <SidebarLayout>{page}</SidebarLayout>
    </AdminRoute>
  );
}

/** The route table; every path comes from {@link APP_ROUTE_PATHS}, which the loading splash reads too. */
function AppRoutes() {
  return (
    <Routes>
      <Route
        path={APP_ROUTE_PATHS.login}
        element={(
          <PublicOnlyRoute>
            <Login />
          </PublicOnlyRoute>
        )}
      />

      {/* Required password change: the one page a user with a temporary password can use */}
      <Route
        path={APP_ROUTE_PATHS.changePassword}
        element={(
          <PasswordChangeRoute>
            <ChangePasswordPage />
          </PasswordChangeRoute>
        )}
      />

      <Route path={APP_ROUTE_PATHS.scheduler} element={privatePage(<SchedulerPage />)} />
      <Route path={APP_ROUTE_PATHS.schedulerAlias} element={<Navigate to={APP_ROUTE_PATHS.scheduler} replace />} />
      <Route path={APP_ROUTE_PATHS.dashboardAlias} element={<Navigate to={APP_ROUTE_PATHS.scheduler} replace />} />
      <Route path={APP_ROUTE_PATHS.customers} element={privatePage(<CustomersPage />)} />
      <Route path={APP_ROUTE_PATHS.quotes} element={privatePage(<QuotesPage />)} />
      <Route path={APP_ROUTE_PATHS.inventory} element={privatePage(<InventoryPage />)} />
      <Route path={APP_ROUTE_PATHS.companyResults} element={privatePage(<CompanyResultsPage />)} />

      <Route path={APP_ROUTE_PATHS.adminRegister} element={adminPage(<RegisterMechanicPage />)} />

      <Route path={APP_ROUTE_PATHS.settings} element={privatePage(<SettingsPage />)} />

      <Route path={APP_ROUTE_PATHS.serverError} element={<ServerError />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

/** Restores the cookie session once at start-up and warms the error-page artwork when the browser is idle. */
function useRestoreAuthOnBoot(): void {
  const setIsAuthenticated = useAuthStore((state) => state.setIsAuthenticated);
  const setIsLoading = useAuthStore((state) => state.setIsLoading);

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
}

function App() {
  useRestoreAuthOnBoot();

  return (
    <>
      {/* Splash on a full browser load of an app route, until the app is ready */}
      <LoadingPage />

      {/* Main app; it goes inert while a modal dialog is open, and the dialogs and toasts sit outside it */}
      <div ref={registerAppShell} data-testid="app-shell" className="contents">
        <ErrorBoundary>
          <Router>
            <SeoManager />

            <Suspense fallback={ROUTE_LOADING_FALLBACK}>
              <AppRoutes />
            </Suspense>
          </Router>
        </ErrorBoundary>
      </div>

      <ToastViewport />
    </>
  );
}

export default App;
