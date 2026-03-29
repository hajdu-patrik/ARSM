import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/auth.store';

const DashboardComponent = memo(function Dashboard() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-purple-500 to-purple-600 dark:from-purple-600 dark:to-purple-700 rounded-2xl p-8 text-white shadow-lg">
        <h1 className="text-4xl font-bold mb-2">{t('dashboard.welcome')}, {user?.email}!</h1>
        <p className="text-purple-100">
          {t('dashboard.title')} - {user?.personType}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Stat Card 1 */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">
                {t('dashboard.appointments')}
              </p>
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2">
                0
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center text-xl">
              📅
            </div>
          </div>
        </div>

        {/* Stat Card 2 */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">
                {t('dashboard.vehicles')}
              </p>
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2">
                0
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center text-xl">
              🚗
            </div>
          </div>
        </div>

        {/* Stat Card 3 */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">
                {t('dashboard.customers')}
              </p>
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2">
                0
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center text-xl">
              👥
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Large Content Area */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
            Legújabb tevékenységek
          </h2>
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
            <p>Jelenleg nincsenek tevékenységek</p>
          </div>
        </div>

        {/* Sidebar */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
            Profil Információk
          </h3>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-slate-600 dark:text-slate-400">E-mail</p>
              <p className="font-medium text-slate-900 dark:text-white">{user?.email}</p>
            </div>
            <div>
              <p className="text-slate-600 dark:text-slate-400">Típus</p>
              <p className="font-medium text-slate-900 dark:text-white capitalize">
                {user?.personType}
              </p>
            </div>
            <div>
              <p className="text-slate-600 dark:text-slate-400">ID</p>
              <p className="font-medium text-slate-900 dark:text-white">{user?.personId}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

DashboardComponent.displayName = 'Dashboard';

export const Dashboard = DashboardComponent;
