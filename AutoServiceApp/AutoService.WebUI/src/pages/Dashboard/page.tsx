import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/auth.store';

const DashboardComponent = memo(function Dashboard() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const localizedPersonType = user?.personType
    ? t(`dashboard.personType.${user.personType.toLowerCase()}`, { defaultValue: user.personType })
    : '-';

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-[#C9B3FF] to-[#BFA6F7] dark:from-[#7A66C7] dark:to-[#8A75D6] rounded-2xl p-8 text-[#2C2440] dark:text-[#F5F2FF] shadow-lg">
        <h1 className="text-4xl font-bold mb-2">{t('dashboard.welcome')}, {user?.email}!</h1>
        <p className="text-[#5E5672] dark:text-[#CFC5EA]">
          {t('dashboard.title')} - {localizedPersonType}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Stat Card 1 */}
        <div className="bg-[#F6F4FB] dark:bg-[#13131B] rounded-xl p-6 border border-[#D8D2E9] dark:border-[#3A3154] shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#5E5672] dark:text-[#CFC5EA] text-sm font-medium">
                {t('dashboard.appointments')}
              </p>
              <p className="text-3xl font-bold text-[#2C2440] dark:text-[#EDE8FA] mt-2">
                0
              </p>
            </div>
            <div className="w-12 h-12 bg-[#EFEBFA] dark:bg-[#241F33] rounded-lg flex items-center justify-center text-xl">
              📅
            </div>
          </div>
        </div>

        {/* Stat Card 2 */}
        <div className="bg-[#F6F4FB] dark:bg-[#13131B] rounded-xl p-6 border border-[#D8D2E9] dark:border-[#3A3154] shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#5E5672] dark:text-[#CFC5EA] text-sm font-medium">
                {t('dashboard.vehicles')}
              </p>
              <p className="text-3xl font-bold text-[#2C2440] dark:text-[#EDE8FA] mt-2">
                0
              </p>
            </div>
            <div className="w-12 h-12 bg-[#EFEBFA] dark:bg-[#241F33] rounded-lg flex items-center justify-center text-xl">
              🚗
            </div>
          </div>
        </div>

        {/* Stat Card 3 */}
        <div className="bg-[#F6F4FB] dark:bg-[#13131B] rounded-xl p-6 border border-[#D8D2E9] dark:border-[#3A3154] shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#5E5672] dark:text-[#CFC5EA] text-sm font-medium">
                {t('dashboard.customers')}
              </p>
              <p className="text-3xl font-bold text-[#2C2440] dark:text-[#EDE8FA] mt-2">
                0
              </p>
            </div>
            <div className="w-12 h-12 bg-[#EFEBFA] dark:bg-[#241F33] rounded-lg flex items-center justify-center text-xl">
              👥
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Large Content Area */}
        <div className="lg:col-span-2 bg-[#F6F4FB] dark:bg-[#13131B] rounded-xl p-6 border border-[#D8D2E9] dark:border-[#3A3154] shadow-sm">
          <h2 className="text-xl font-bold text-[#2C2440] dark:text-[#EDE8FA] mb-4">
            {t('dashboard.recentActivities')}
          </h2>
          <div className="text-center py-12 text-[#6A627F] dark:text-[#B9B0D3]">
            <p>{t('dashboard.noActivities')}</p>
          </div>
        </div>

        {/* Sidebar */}
        <div className="bg-[#F6F4FB] dark:bg-[#13131B] rounded-xl p-6 border border-[#D8D2E9] dark:border-[#3A3154] shadow-sm">
          <h3 className="text-lg font-bold text-[#2C2440] dark:text-[#EDE8FA] mb-4">
            {t('dashboard.profileInfo')}
          </h3>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-[#5E5672] dark:text-[#CFC5EA]">{t('dashboard.email')}</p>
              <p className="font-medium text-[#2C2440] dark:text-[#EDE8FA]">{user?.email}</p>
            </div>
            <div>
              <p className="text-[#5E5672] dark:text-[#CFC5EA]">{t('dashboard.type')}</p>
              <p className="font-medium text-[#2C2440] dark:text-[#EDE8FA] capitalize">
                {localizedPersonType}
              </p>
            </div>
            <div>
              <p className="text-[#5E5672] dark:text-[#CFC5EA]">{t('dashboard.id')}</p>
              <p className="font-medium text-[#2C2440] dark:text-[#EDE8FA]">{user?.personId}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

DashboardComponent.displayName = 'Dashboard';

export const Dashboard = DashboardComponent;
