import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useAuthStore } from './store/auth.store';
import { authService } from './services/auth.service';
import { LoadingPage } from './pages/LoadingPage';
import { Login } from './pages/Login/page';
import { Dashboard } from './pages/Dashboard/page';
import { NotFound } from './pages/NotFound';
import { PrivateRoute } from './router/PrivateRoute';
import { Layout } from './components/layout/Layout';
import './utils/i18n';

function App() {
  const setIsAuthenticated = useAuthStore((state) => state.setIsAuthenticated);

  const dashboardElement = (
    <PrivateRoute>
      <Layout>
        <Dashboard />
      </Layout>
    </PrivateRoute>
  );

  useEffect(() => {
    // Restore auth state from localStorage
    const user = authService.restoreAuth();
    setIsAuthenticated(!!user);
  }, [setIsAuthenticated]);

  return (
    <>
      {/* Show loading page on first app load */}
      <LoadingPage />

      {/* Main app */}
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          {/* Login Route */}
          <Route path="/login" element={<Login />} />

          {/* Dashboard Route (Protected) */}
          <Route path="/" element={dashboardElement} />
          <Route path="/dashboard" element={dashboardElement} />

          {/* 404 Not Found */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </>
  );
}

export default App;