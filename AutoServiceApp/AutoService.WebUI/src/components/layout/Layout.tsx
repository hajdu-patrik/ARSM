import { memo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authService } from '../../services/auth.service';
import { useAuthStore } from '../../store/auth.store';
import { ThemeLanguageControls } from './ThemeLanguageControls';

interface LayoutProps {
  readonly children: React.ReactNode;
}

const LayoutComponent = memo(function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);

  const handleLogout = useCallback(() => {
    authService.logout();
    navigate('/login');
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white">
      <ThemeLanguageControls />

      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          {/* Logo/Title */}
          <div>
            <h1 className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              AutoService
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {user?.email}
            </p>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-4">
            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium transition-all"
            >
              {t('layout.logout')}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-sm text-slate-600 dark:text-slate-400">
          <p>&copy; {new Date().getFullYear()} Auto Service. {t('layout.allRightsReserved')}</p>
        </div>
      </footer>
    </div>
  );
});

LayoutComponent.displayName = 'Layout';

export const Layout = LayoutComponent;
