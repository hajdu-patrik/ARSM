import { memo, useState, useCallback, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Clock3 } from 'lucide-react';
import type { AppointmentDto, AppointmentStatus } from '../../../../types/scheduler/scheduler.types';
import { StatusBadge } from './StatusBadge';
import { MechanicAvatar } from './MechanicAvatar';
import { getDueState } from '../../utils/due-date';
import { formatScheduledTime } from '../../utils/scheduler-datetime';

interface AppointmentCardProps {
  readonly appointment: AppointmentDto;
  readonly currentMechanicId: number | undefined;
  readonly onClaim: (id: number) => Promise<void>;
  readonly onStatusChange: (id: number, status: AppointmentStatus) => Promise<void>;
  readonly onClick?: () => void;
}

const STATUS_OPTIONS: AppointmentStatus[] = ['InProgress', 'Completed', 'Cancelled'];

const AppointmentCardComponent = memo(function AppointmentCard({
  appointment,
  currentMechanicId,
  onClaim,
  onStatusChange,
  onClick,
}: AppointmentCardProps) {
  const { t, i18n } = useTranslation();
  const [isClaiming, setIsClaiming] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const scheduledTime = formatScheduledTime(appointment.scheduledDate, i18n.language);

  const isAssigned = currentMechanicId !== undefined &&
    appointment.mechanics.some((m) => m.id === currentMechanicId);
  const dueState = getDueState(appointment.dueDateTime);

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
  const shouldShowClaimButton = !isAssigned && appointment.status === 'InProgress' && !dueState.isOverdue;
  const cardClassName = `bg-[#F6F4FB] dark:bg-[#13131B] rounded-2xl border border-[#D8D2E9] dark:border-[#3A3154] shadow-sm hover:shadow-md transition-shadow p-4 flex flex-col gap-3${onClick ? ' cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9B3FF66]' : ''}`;

  const cardContent: ReactNode = (
    <>
      {/* Header: Brand Model Year + Status */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-[#2C2440] dark:text-[#EDE8FA]">
            {vehicle.brand} {vehicle.model}
          </h3>
          <span className="text-xs text-[#6A627F] dark:text-[#B9B0D3]">{vehicle.year}</span>
        </div>
        <StatusBadge status={appointment.status} />
      </div>

      <div className="inline-flex items-center gap-1 text-xs text-[#6A627F] dark:text-[#B9B0D3]">
        <Clock3 className="h-3.5 w-3.5" />
        <span>{t('scheduler.detail.scheduledDate')}: {scheduledTime}</span>
      </div>

      {/* Vehicle specs */}
      <div className="grid grid-cols-2 gap-2 text-xs text-[#6A627F] dark:text-[#B9B0D3] sm:grid-cols-3">
        <span className="truncate">{t('scheduler.specs.mileage', { value: vehicle.mileageKm.toLocaleString() })}</span>
        <span className="truncate">{t('scheduler.specs.torque', { value: vehicle.engineTorqueNm })}</span>
        <span className="truncate">{t('scheduler.specs.power', { value: vehicle.enginePowerHp })}</span>
      </div>

      {/* Task description */}
      <div className="bg-[#EFEBFA] dark:bg-[#241F33] rounded-lg px-3 py-2 text-sm border border-[#D8D2E9] dark:border-[#3A3154]">
        <p className="text-xs text-[#6A627F] dark:text-[#B9B0D3] mb-0.5">{t('scheduler.repairTask')}</p>
        <p className="break-words text-[#2C2440] dark:text-[#EDE8FA]">{appointment.taskDescription}</p>
      </div>

      {/* Due state */}
      <div className="flex items-center justify-between rounded-lg border border-[#D8D2E9] bg-[#F6F4FB] px-3 py-2 dark:border-[#3A3154] dark:bg-[#1A1A25]">
        <span className="inline-flex items-center gap-1 text-xs text-[#6A627F] dark:text-[#B9B0D3]">
          <Clock3 className="h-3.5 w-3.5" />
          {t('scheduler.due.label')}
        </span>
        <span className={`text-xs font-semibold ${dueState.toneClassName}`}>
          {t(dueState.labelKey, dueState.labelValues)}
        </span>
      </div>

      {/* Mechanics + License plate */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <span className="mb-1 block text-xs text-[#6A627F] dark:text-[#B9B0D3]">{t('scheduler.mechanics')}</span>
          <div className="flex flex-wrap items-center gap-1.5">
            {appointment.mechanics.map((m) => (
              <MechanicAvatar
                key={m.id}
                mechanicId={m.id}
                fullName={m.fullName}
                hasProfilePicture={m.hasProfilePicture}
              />
            ))}
          </div>
        </div>
        <span className="inline-block shrink-0 bg-[#EFEBFA] dark:bg-[#241F33] text-[#2C2440] dark:text-[#F5F2FF] text-xs font-mono px-2 py-0.5 rounded border border-[#D8D2E9] dark:border-[#3A3154]">
          {vehicle.licensePlate}
        </span>
      </div>

      {/* Status change (for assigned mechanics) */}
      {isAssigned && (
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
        <div onClick={(e) => e.stopPropagation()}>
          <select
            value={appointment.status}
            onChange={(e) => { e.stopPropagation(); void handleStatusChange(e); }}
            disabled={isUpdating}
            className="w-full mt-1 py-1.5 px-2 rounded-lg border border-[#D8D2E9] dark:border-[#3A3154] bg-[#F6F4FB] dark:bg-[#1A1A25] text-sm text-[#2C2440] dark:text-[#EDE8FA] disabled:opacity-50"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {t(`scheduler.status.${s.toLowerCase()}`)}
              </option>
            ))}
          </select>
        </div>
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
          onClick={(e) => { e.stopPropagation(); void handleClaim(); }}
          disabled={isClaiming}
          className="w-full mt-2 py-2 rounded-xl bg-[#C9B3FF] text-[#2C2440] dark:bg-[#7A66C7] dark:text-[#F5F2FF] hover:bg-[#BFA6F7] dark:hover:bg-[#8A75D6] text-sm font-medium transition-colors disabled:opacity-50"
        >
          {isClaiming ? '...' : t('scheduler.claim')}
        </button>
      )}
    </>
  );

  if (onClick) {
    return (
      // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
      <div
        onClick={onClick}
        className={`${cardClassName} w-full text-left`}
      >
        {cardContent}
      </div>
    );
  }

  return (
    <div className={cardClassName}>
      {cardContent}
    </div>
  );
});

AppointmentCardComponent.displayName = 'AppointmentCard';

export const AppointmentCard = AppointmentCardComponent;
