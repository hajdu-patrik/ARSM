/**
 * Appointment card component for the scheduler grid and list views.
 * Displays vehicle info, task description, due state, mechanic avatars,
 * license plate, and a claim button for unassigned in-progress appointments.
 * @module AppointmentCard
 */
import { memo, useState, useCallback, type KeyboardEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Clock3 } from 'lucide-react';
import type { AppointmentDto } from '../../../../types/scheduler/scheduler.types';
import { StatusBadge } from './StatusBadge';
import { MechanicAvatar } from './MechanicAvatar';
import { getDueState } from '../../utils/due-date';

/** Props for the {@link AppointmentCard} component. */
interface AppointmentCardProps {
  /** The appointment data to render. */
  readonly appointment: AppointmentDto;
  /** ID of the currently authenticated mechanic, used to determine assignment status. */
  readonly currentMechanicId: number | undefined;
  /** Callback to claim the appointment; receives the appointment ID. */
  readonly onClaim: (id: number) => Promise<void>;
  /** Optional click handler that makes the entire card interactive. */
  readonly onClick?: () => void;
}

const AppointmentCardComponent = memo(function AppointmentCard({
  appointment,
  currentMechanicId,
  onClaim,
  onClick,
}: AppointmentCardProps) {
  const { t } = useTranslation();
  const [isClaiming, setIsClaiming] = useState(false);

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

  const handleCardKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (event.currentTarget !== event.target) {
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick?.();
    }
  }, [onClick]);

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
        <span className={`max-w-[55%] break-words text-right text-xs font-semibold leading-tight ${dueState.toneClassName}`}>
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

      {/* Claim button or Assigned label */}
      {isAssigned && (
        <div className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400 font-medium mt-1">
          <Check className="w-4 h-4" />
          {t('scheduler.assigned')}
        </div>
      )}

      {shouldShowClaimButton && (
        <div className="mt-2 flex justify-center">
          <button
            onClick={(e) => { e.stopPropagation(); void handleClaim(); }}
            disabled={isClaiming}
            className="w-full rounded-xl bg-[#C9B3FF] py-2 text-sm font-medium text-[#2C2440] transition-colors hover:bg-[#BFA6F7] disabled:opacity-50 dark:bg-[#7A66C7] dark:text-[#F5F2FF] dark:hover:bg-[#8A75D6]"
          >
            {isClaiming ? '...' : t('scheduler.claim')}
          </button>
        </div>
      )}
    </>
  );

  if (onClick) {
    return (
      <div
        onClick={onClick}
        onKeyDown={handleCardKeyDown}
        tabIndex={0}
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

/** Memoized appointment card for scheduler grid and list views. */
export const AppointmentCard = AppointmentCardComponent;
