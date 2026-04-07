import { memo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import type { AppointmentDto, AppointmentStatus } from '../../../types/scheduler.types';
import { StatusBadge } from './StatusBadge';

interface AppointmentCardProps {
  readonly appointment: AppointmentDto;
  readonly currentMechanicId: number | undefined;
  readonly onClaim: (id: number) => Promise<void>;
  readonly onStatusChange: (id: number, status: AppointmentStatus) => Promise<void>;
}

const STATUS_OPTIONS: AppointmentStatus[] = ['Scheduled', 'InProgress', 'Completed', 'Cancelled'];

const AppointmentCardComponent = memo(function AppointmentCard({
  appointment,
  currentMechanicId,
  onClaim,
  onStatusChange,
}: AppointmentCardProps) {
  const { t } = useTranslation();
  const [isClaiming, setIsClaiming] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const isAssigned = currentMechanicId !== undefined &&
    appointment.mechanics.some((m) => m.id === currentMechanicId);
  const isCancelled = appointment.status === 'Cancelled';

  const handleClaim = useCallback(async () => {
    setIsClaiming(true);
    try {
      await onClaim(appointment.id);
    } finally {
      setIsClaiming(false);
    }
  }, [onClaim, appointment.id]);

  const handleStatusChange = useCallback(async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as AppointmentStatus;
    setIsUpdating(true);
    try {
      await onStatusChange(appointment.id, newStatus);
    } finally {
      setIsUpdating(false);
    }
  }, [onStatusChange, appointment.id]);

  const { vehicle } = appointment;
  const shouldShowClaimButton = !isAssigned && !isCancelled;

  return (
    <div className="bg-[#F6F4FB] dark:bg-[#13131B] rounded-2xl border border-[#D8D2E9] dark:border-[#3A3154] shadow-sm hover:shadow-md transition-shadow p-4 flex flex-col gap-3">
      {/* Header: Brand Model Year + Status */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-[#2C2440] dark:text-[#EDE8FA]">
            {vehicle.brand} {vehicle.model}
          </h3>
          <span className="text-xs text-[#6A627F] dark:text-[#B9B0D3]">{vehicle.year}</span>
        </div>
        <StatusBadge status={appointment.status} />
      </div>

      {/* Vehicle specs */}
      <div className="flex gap-4 text-xs text-[#6A627F] dark:text-[#B9B0D3]">
        <span>{t('scheduler.specs.mileage', { value: vehicle.mileageKm.toLocaleString() })}</span>
        <span>{t('scheduler.specs.torque', { value: vehicle.engineTorqueNm })}</span>
        <span>{t('scheduler.specs.power', { value: vehicle.enginePowerHp })}</span>
      </div>

      {/* Task description */}
      <div className="bg-[#EFEBFA] dark:bg-[#241F33] rounded-lg px-3 py-2 text-sm border border-[#D8D2E9] dark:border-[#3A3154]">
        <p className="text-xs text-[#6A627F] dark:text-[#B9B0D3] mb-0.5">{t('scheduler.repairTask')}</p>
        <p className="text-[#2C2440] dark:text-[#EDE8FA]">{appointment.taskDescription}</p>
      </div>

      {/* Mechanics + License plate */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[#6A627F] dark:text-[#B9B0D3] mr-1">{t('scheduler.mechanics')}</span>
          {appointment.mechanics.map((m) => (
            <div
              key={m.id}
              className="w-7 h-7 rounded-full bg-[#C9B3FF] text-[#2C2440] dark:bg-[#7A66C7] dark:text-[#F5F2FF] text-xs flex items-center justify-center font-bold"
              title={m.fullName}
            >
              {m.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
          ))}
        </div>
        <span className="inline-block bg-[#EFEBFA] dark:bg-[#241F33] text-[#2C2440] dark:text-[#F5F2FF] text-xs font-mono px-2 py-0.5 rounded border border-[#D8D2E9] dark:border-[#3A3154]">
          {vehicle.licensePlate}
        </span>
      </div>

      {/* Status change (for assigned mechanics) */}
      {isAssigned && (
        <select
          value={appointment.status}
          onChange={(e) => { void handleStatusChange(e); }}
          disabled={isUpdating}
          className="w-full mt-1 py-1.5 px-2 rounded-lg border border-[#D8D2E9] dark:border-[#3A3154] bg-[#F6F4FB] dark:bg-[#1A1A25] text-sm text-[#2C2440] dark:text-[#EDE8FA] disabled:opacity-50"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {t(`scheduler.status.${s.toLowerCase()}`)}
            </option>
          ))}
        </select>
      )}

      {/* Claim button or Assigned label */}
      {isAssigned && (
        <div className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400 font-medium mt-1">
          <Check className="w-4 h-4" />
          {t('scheduler.assigned')}
        </div>
      )}

      {shouldShowClaimButton && (
        <button
          onClick={() => { void handleClaim(); }}
          disabled={isClaiming}
          className="w-full mt-2 py-2 rounded-xl bg-[#C9B3FF] text-[#2C2440] dark:bg-[#7A66C7] dark:text-[#F5F2FF] hover:bg-[#BFA6F7] dark:hover:bg-[#8A75D6] text-sm font-medium transition-colors disabled:opacity-50"
        >
          {isClaiming ? '...' : t('scheduler.claim')}
        </button>
      )}
    </div>
  );
});

AppointmentCardComponent.displayName = 'AppointmentCard';

export const AppointmentCard = AppointmentCardComponent;
