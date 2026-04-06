import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useAuthStore } from './store/auth.store';
import { authService } from './services/auth.service';
import { LoadingPage } from './pages/LoadingPage';
import { Login } from './pages/Login/page';
import { SchedulerPage } from './pages/Scheduler/page';
import { PlaceholderPage } from './pages/Placeholder/page';
import { NotFound } from './pages/NotFound';
import { PrivateRoute } from './router/PrivateRoute';
import { AdminRoute } from './router/AdminRoute';
import { PublicOnlyRoute } from './router/PublicOnlyRoute';
import { SidebarLayout } from './components/layout/SidebarLayout';
import { ToastViewport } from './components/common/ToastViewport';
import { RegisterMechanicPage } from './pages/Admin/RegisterMechanic/page';
import { SettingsPage } from './pages/Settings/page';
import './utils/i18n';

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
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
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
          <Route path="/scheduler" element={schedulerElement} />
          <Route path="/dashboard" element={schedulerElement} />

          {/* Admin Routes */}
          <Route path="/admin/register" element={<AdminRoute><SidebarLayout><RegisterMechanicPage /></SidebarLayout></AdminRoute>} />

          {/* Placeholder Routes (Protected) */}
          <Route path="/tools" element={<PrivateRoute><SidebarLayout><PlaceholderPage title="tools" /></SidebarLayout></PrivateRoute>} />
          <Route path="/inventory" element={<PrivateRoute><SidebarLayout><PlaceholderPage title="inventory" /></SidebarLayout></PrivateRoute>} />
          <Route path="/settings" element={<PrivateRoute><SidebarLayout><SettingsPage /></SidebarLayout></PrivateRoute>} />

          {/* 404 Not Found */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>

      <ToastViewport />
    </>
  );
}

export default App;
