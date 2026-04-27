/**
 * Appointment card component for the scheduler grid and list views.
 * Displays vehicle info, task description, due state, mechanic avatars,
 * license plate, and a claim button for unassigned in-progress appointments.
 * @module AppointmentCard
 */
import { memo, useState, useCallback, type ReactNode } from 'react';
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
    appointment.mechanics.some((mechanic) => mechanic.id === currentMechanicId);
  const dueState = getDueState(appointment.dueDateTime);

  const handleClaim = useCallback(async () => {
    setIsClaiming(true);
    try {
      await onClaim(appointment.id);
    } finally {
      setIsClaiming(false);
    }
  }, [onClaim, appointment.id]);

  const { vehicle } = appointment;
  const shouldShowClaimButton = !isAssigned && appointment.status === 'InProgress' && !dueState.isOverdue;
  const cardClassName = `relative overflow-hidden rounded-2xl border border-arsm-border bg-arsm-card p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:ring-2 hover:ring-arsm-focus-ring/45 dark:border-arsm-border-dark dark:bg-arsm-card-dark dark:hover:ring-arsm-focus-ring/30 flex flex-col gap-3${onClick ? ' cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/40' : ''}`;

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
      <div className="rounded-lg border border-arsm-border bg-arsm-toggle-bg px-3 py-2 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.48)] dark:border-arsm-border-dark dark:bg-arsm-toggle-bg-dark dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
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
            {appointment.mechanics.map((mechanic) => (
              <MechanicAvatar
                key={mechanic.id}
                mechanicId={mechanic.id}
                fullName={mechanic.fullName}
                hasProfilePicture={mechanic.hasProfilePicture}
              />
            ))}
          </div>
        </div>
        <span className="inline-block shrink-0 rounded border border-arsm-border bg-arsm-toggle-bg px-2 py-0.5 font-mono text-xs text-arsm-primary dark:border-arsm-border-dark dark:bg-arsm-toggle-bg-dark dark:text-arsm-hover">
          {vehicle.licensePlate}
        </span>
      </div>

      {/* Claim button or Assigned label */}
      {isAssigned && (
        <div className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-arsm-success-border/60 bg-arsm-success-bg px-3 py-1.5 text-sm font-semibold text-arsm-success-text shadow-[0_4px_12px_rgba(34,197,94,0.1)] dark:border-arsm-success-border-dark/60 dark:bg-arsm-success-bg-dark dark:text-arsm-success-text-dark dark:shadow-[0_4px_12px_rgba(34,197,94,0.06)]">
          <Check className="w-4 h-4" />
          {t('scheduler.assigned')}
        </div>
      )}

      {shouldShowClaimButton && (
        <div className="mt-2 flex justify-center">
          <button
            onClick={(e) => { e.stopPropagation(); void handleClaim(); }}
            disabled={isClaiming}
            className="pointer-events-auto w-full rounded-xl bg-arsm-accent py-2 text-sm font-semibold text-arsm-primary shadow-[0_10px_22px_rgba(97,67,154,0.24)] transition duration-200 hover:-translate-y-px hover:bg-arsm-accent-hover hover:shadow-[0_14px_28px_rgba(97,67,154,0.3)] disabled:opacity-50 disabled:shadow-none dark:bg-arsm-accent-dark dark:text-arsm-hover dark:shadow-[0_12px_24px_rgba(8,10,20,0.5)] dark:hover:bg-arsm-accent-dark-hover dark:hover:shadow-[0_16px_30px_rgba(8,10,20,0.58)]"
          >
            {isClaiming ? '...' : t('scheduler.claim')}
          </button>
        </div>
      )}
    </>
  );

  if (onClick) {
    return (
      <div className={`${cardClassName} relative w-full text-left`}>
        <button
          type="button"
          onClick={onClick}
          className="absolute inset-0 z-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/40"
          aria-label={t('scheduler.detail.title')}
        />
        <div className="relative z-10 pointer-events-none">
          {cardContent}
        </div>
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
