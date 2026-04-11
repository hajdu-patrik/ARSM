import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { AppointmentDto, AppointmentStatus } from '../../../../types/scheduler/scheduler.types';
import { AppointmentCard } from '../shared/AppointmentCard';

interface PlannerSpaceProps {
  readonly appointments: AppointmentDto[];
  readonly isLoading: boolean;
  readonly currentMechanicId: number | undefined;
  readonly onClaim: (id: number) => Promise<void>;
  readonly onStatusChange: (id: number, status: AppointmentStatus) => Promise<void>;
}

const PlannerSpaceComponent = memo(function PlannerSpace({
  appointments,
  isLoading,
  currentMechanicId,
  onClaim,
  onStatusChange,
}: PlannerSpaceProps) {
  const { t, i18n } = useTranslation();

  const todayFormatted = new Intl.DateTimeFormat(i18n.language, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  const scheduledCount = appointments.length;

  return (
    <section>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div>
          <h2 className="text-xl font-bold text-[#2C2440] dark:text-[#EDE8FA]">
            {t('scheduler.plannerSpace')}
          </h2>
          <p className="text-sm text-[#6A627F] dark:text-[#B9B0D3]">
            {t('scheduler.todayDate', { date: todayFormatted })}
          </p>
        </div>
        <span className="inline-flex items-center bg-[#EFEBFA] dark:bg-[#241F33] text-[#2C2440] dark:text-[#F5F2FF] text-xs font-medium px-3 py-1 rounded-full">
          {t('scheduler.scheduledCount', { count: scheduledCount })}
        </span>
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[0, 1].map((i) => (
            <div key={i} className="bg-[#F6F4FB] dark:bg-[#13131B] rounded-2xl border border-[#D8D2E9] dark:border-[#3A3154] p-4 h-48 animate-pulse">
              <div className="h-4 bg-[#EFEBFA] dark:bg-[#241F33] rounded w-2/3 mb-3" />
              <div className="h-3 bg-[#EFEBFA] dark:bg-[#241F33] rounded w-1/2 mb-3" />
              <div className="h-16 bg-[#EFEBFA] dark:bg-[#241F33] rounded mb-3" />
              <div className="h-3 bg-[#EFEBFA] dark:bg-[#241F33] rounded w-1/3" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && appointments.length === 0 && (
        <div className="text-center py-12 text-[#6A627F] dark:text-[#B9B0D3]">
          <p>{t('scheduler.emptyToday')}</p>
        </div>
      )}

      {/* Card grid */}
      {!isLoading && appointments.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {appointments.map((appointment) => (
            <AppointmentCard
              key={appointment.id}
              appointment={appointment}
              currentMechanicId={currentMechanicId}
              onClaim={onClaim}
              onStatusChange={onStatusChange}
            />
          ))}
        </div>
      )}
    </section>
  );
});

PlannerSpaceComponent.displayName = 'PlannerSpace';

export const PlannerSpace = PlannerSpaceComponent;
