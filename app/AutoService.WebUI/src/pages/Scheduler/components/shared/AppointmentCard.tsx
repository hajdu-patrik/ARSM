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
  const cardClassName = `bg-arsm-input dark:bg-arsm-card-dark rounded-2xl border border-arsm-border dark:border-arsm-border-dark shadow-sm hover:shadow-md transition-shadow p-4 flex flex-col gap-3${onClick ? ' cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsm-accent/40' : ''}`;

  const cardContent: ReactNode = (
    <>
      {/* Header: Brand Model Year + Status */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-arsm-primary dark:text-arsm-primary-dark">
            {vehicle.brand} {vehicle.model}
          </h3>
          <span className="text-xs text-arsm-muted dark:text-arsm-muted-dark">{vehicle.year}</span>
        </div>
        <StatusBadge status={appointment.status} />
      </div>

      {/* Vehicle specs */}
      <div className="grid grid-cols-2 gap-2 text-xs text-arsm-muted dark:text-arsm-muted-dark sm:grid-cols-3">
        <span className="truncate">{t('scheduler.specs.mileage', { value: vehicle.mileageKm.toLocaleString() })}</span>
        <span className="truncate">{t('scheduler.specs.torque', { value: vehicle.engineTorqueNm })}</span>
        <span className="truncate">{t('scheduler.specs.power', { value: vehicle.enginePowerHp })}</span>
      </div>

      {/* Task description */}
      <div className="bg-arsm-toggle-bg dark:bg-arsm-toggle-bg-dark rounded-lg px-3 py-2 text-sm border border-arsm-border dark:border-arsm-border-dark">
        <p className="text-xs text-arsm-muted dark:text-arsm-muted-dark mb-0.5">{t('scheduler.repairTask')}</p>
        <p className="break-words text-arsm-primary dark:text-arsm-primary-dark">{appointment.taskDescription}</p>
      </div>

      {/* Due state */}
      <div className="flex items-center justify-between rounded-lg border border-arsm-border bg-arsm-input px-3 py-2 dark:border-arsm-border-dark dark:bg-arsm-input-dark">
        <span className="inline-flex items-center gap-1 text-xs text-arsm-muted dark:text-arsm-muted-dark">
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
          <span className="mb-1 block text-xs text-arsm-muted dark:text-arsm-muted-dark">{t('scheduler.mechanics')}</span>
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
        <span className="inline-block shrink-0 bg-arsm-toggle-bg dark:bg-arsm-toggle-bg-dark text-arsm-primary dark:text-arsm-hover text-xs font-mono px-2 py-0.5 rounded border border-arsm-border dark:border-arsm-border-dark">
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
            className="w-full rounded-xl bg-arsm-accent py-2 text-sm font-medium text-arsm-primary transition-colors hover:bg-arsm-accent-hover disabled:opacity-50 dark:bg-arsm-accent-dark dark:text-arsm-hover dark:hover:bg-arsm-accent-dark-hover"
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
