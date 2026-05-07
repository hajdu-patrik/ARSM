/**
 * Appointment card component for scheduler grid/list views.
 * @module AppointmentCard
 */
import { memo, useCallback, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Check, Clock3, LogOut } from 'lucide-react';
import type { AppointmentDto } from '../../../../types/scheduler/scheduler.types';
import { StatusBadge } from './StatusBadge';
import { MechanicAvatar } from './MechanicAvatar';
import { getDueState } from '../../utils/due-date';

interface AppointmentCardProps {
  readonly appointment: AppointmentDto;
  readonly currentMechanicId: number | undefined;
  readonly onClaim: (id: number) => Promise<void>;
  readonly onUnclaim: (id: number) => Promise<void>;
  readonly onClick?: () => void;
}

const AppointmentCardComponent = memo(function AppointmentCard({
  appointment,
  currentMechanicId,
  onClaim,
  onUnclaim,
  onClick,
}: AppointmentCardProps) {
  const { t } = useTranslation();
  const [isClaiming, setIsClaiming] = useState(false);
  const [isUnclaiming, setIsUnclaiming] = useState(false);

  const isAssigned = currentMechanicId !== undefined
    && appointment.mechanics.some((mechanic) => mechanic.id === currentMechanicId);
  const dueState = getDueState(appointment.dueDateTime);
  const { vehicle } = appointment;
  const shouldShowClaimButton = !isAssigned && appointment.status === 'InProgress' && !dueState.isOverdue;
  const shouldShowUnclaimButton = isAssigned && appointment.status === 'InProgress';
  const vehicleTitle = `${vehicle.brand} ${vehicle.model} (${vehicle.year})`;

  const handleClaim = useCallback(async () => {
    setIsClaiming(true);
    try {
      await onClaim(appointment.id);
    } finally {
      setIsClaiming(false);
    }
  }, [appointment.id, onClaim]);

  const handleUnclaim = useCallback(async () => {
    setIsUnclaiming(true);
    try {
      await onUnclaim(appointment.id);
    } finally {
      setIsUnclaiming(false);
    }
  }, [appointment.id, onUnclaim]);

  const cardClassName = `relative overflow-hidden rounded-2xl border border-arsm-border bg-arsm-card p-4 transition-all duration-200 hover:ring-2 hover:ring-arsm-focus-ring/45 dark:border-arsm-border-dark dark:bg-arsm-card-dark dark:hover:ring-arsm-focus-ring/30 flex flex-col gap-5${onClick ? ' cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/40' : ''}`;

  const cardContent: ReactNode = (
    <>
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-arsm-primary dark:text-arsm-primary-dark">
            {vehicleTitle}
          </h3>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
          <span className="inline-block max-w-full truncate rounded border border-arsm-border bg-arsm-toggle-bg px-2 py-0.5 font-mono text-xs text-arsm-primary dark:border-arsm-border-dark dark:bg-arsm-toggle-bg-dark dark:text-arsm-hover">
            {vehicle.licensePlate}
          </span>
          <StatusBadge status={appointment.status} />
        </div>
      </div>

      <div className="rounded-lg border border-arsm-border bg-arsm-toggle-bg px-3 py-2 dark:border-arsm-border-dark dark:bg-arsm-toggle-bg-dark">
        <div className="grid grid-cols-2 gap-2 text-xs text-arsm-muted dark:text-arsm-muted-dark sm:grid-cols-3">
          <span className="truncate">{t('scheduler.specs.mileage', { value: vehicle.mileageKm.toLocaleString() })}</span>
          <span className="truncate">{t('scheduler.specs.torque', { value: vehicle.engineTorqueNm })}</span>
          <span className="truncate">{t('scheduler.specs.power', { value: vehicle.enginePowerHp })}</span>
        </div>
      </div>

      <div className="rounded-lg border border-arsm-border bg-arsm-toggle-bg px-3 py-2 text-sm dark:border-arsm-border-dark dark:bg-arsm-toggle-bg-dark">
        <p className="mb-0.5 text-xs text-arsm-muted dark:text-arsm-muted-dark">{t('scheduler.repairTask')}</p>
        <p className="break-words text-arsm-primary dark:text-arsm-primary-dark">{appointment.taskDescription}</p>
      </div>

      <div className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-arsm-border bg-arsm-input px-3 py-2 dark:border-arsm-border-dark dark:bg-arsm-input-dark">
        <span className="inline-flex min-w-0 items-center gap-1 text-xs text-arsm-muted dark:text-arsm-muted-dark">
          <Clock3 className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{t('scheduler.due.label')}</span>
        </span>
        <span className={`min-w-0 max-w-[55%] break-words text-right text-xs font-semibold leading-tight ${dueState.toneClassName}`}>
          {t(dueState.labelKey, dueState.labelValues)}
        </span>
      </div>

      <div className="mt-auto flex w-full flex-wrap items-center justify-between gap-2 border-t border-arsm-border/70 pt-3 dark:border-arsm-border-dark/70">
        <div className="min-w-0 flex flex-1 flex-wrap items-center gap-2">
          <span className="shrink-0 text-xs text-arsm-muted dark:text-arsm-muted-dark">{t('scheduler.mechanics')}</span>
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

        <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2">
          {shouldShowClaimButton && (
            <button
              onClick={(event) => {
                event.stopPropagation();
                void handleClaim();
              }}
              disabled={isClaiming}
              className="group pointer-events-auto inline-flex max-w-full min-w-0 items-center justify-center gap-1.5 rounded-lg border border-arsm-accent/45 bg-arsm-accent px-3 py-1.5 text-xs font-semibold text-arsm-primary transition-all duration-200 hover:-translate-y-px hover:bg-arsm-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/45 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60 dark:border-arsm-accent-dark/45 dark:bg-arsm-accent-dark dark:text-arsm-hover dark:hover:bg-arsm-accent-dark-hover"
            >
              {isClaiming ? '...' : (
                <>
                  <span className="truncate">{t('scheduler.claim')}</span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          )}

          {shouldShowUnclaimButton && (
            <button
              onClick={(event) => {
                event.stopPropagation();
                void handleUnclaim();
              }}
              disabled={isUnclaiming}
              className="group pointer-events-auto inline-flex max-w-full min-w-0 items-center justify-center gap-1.5 rounded-lg border border-arsm-error-border/65 bg-arsm-error-bg px-3 py-1.5 text-xs font-semibold text-arsm-error-text transition-all duration-200 hover:-translate-y-px hover:bg-arsm-error-bg-dark/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/45 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60 dark:border-arsm-error-dark/65 dark:bg-arsm-error-bg-dark dark:text-arsm-error-text-light dark:hover:bg-arsm-error-bg-dark/80"
            >
              {isUnclaiming ? '...' : (
                <>
                  <span className="truncate">{t('scheduler.detail.unassignMe')}</span>
                  <LogOut className="h-3.5 w-3.5 shrink-0" />
                </>
              )}
            </button>
          )}

          {!shouldShowClaimButton && !shouldShowUnclaimButton && isAssigned && (
            <div className="inline-flex max-w-full min-w-0 items-center gap-1 rounded-full border border-arsm-success-border/65 bg-arsm-success-bg px-2 py-0.5 text-[10px] font-semibold text-arsm-success-text dark:border-arsm-success-border-dark/65 dark:bg-arsm-success-bg-dark dark:text-arsm-success-text-dark">
              <Check className="h-3 w-3 shrink-0" />
              <span className="truncate">{t('scheduler.assigned')}</span>
            </div>
          )}
        </div>
      </div>
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
        <div className="relative z-10 pointer-events-none">{cardContent}</div>
      </div>
    );
  }

  return <div className={cardClassName}>{cardContent}</div>;
});

AppointmentCardComponent.displayName = 'AppointmentCard';
export const AppointmentCard = AppointmentCardComponent;
