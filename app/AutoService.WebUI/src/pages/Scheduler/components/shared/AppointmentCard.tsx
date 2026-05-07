/**
 * Appointment card component for scheduler grid/list views.
 * @module AppointmentCard
 */
import { memo, useCallback, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Check, Clock3, LogOut } from 'lucide-react';
import type { AppointmentDto } from '../../../../types/scheduler/scheduler.types';
import {
  schedulerMiniDangerStrongActionButtonClass,
  schedulerMiniPrimaryActionButtonClass,
} from '../../../../utils/formStyles';
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
  const { t, i18n } = useTranslation();
  const [isClaiming, setIsClaiming] = useState(false);
  const [isUnclaiming, setIsUnclaiming] = useState(false);

  const isAssigned = currentMechanicId !== undefined
    && appointment.mechanics.some((mechanic) => mechanic.id === currentMechanicId);
  const dueState = getDueState(appointment.dueDateTime);
  const { vehicle } = appointment;
  const canClaimAppointment = !isAssigned && appointment.status === 'InProgress' && !dueState.isOverdue;
  const canUnclaimAppointment = isAssigned && appointment.status === 'InProgress';
  const vehicleTitle = `${vehicle.brand} ${vehicle.model} (${vehicle.year})`;

  const scheduleDateValue = new Date(appointment.scheduledDate);
  const hasValidScheduleDate = !Number.isNaN(scheduleDateValue.getTime());

  const scheduleDateLabel = hasValidScheduleDate
    ? new Intl.DateTimeFormat(i18n.language, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(scheduleDateValue)
    : t('scheduler.due.unknown');

  const handleClaim = useCallback(async () => {
    setIsClaiming(true);
    try {
      await onClaim(appointment.id);
    } catch (error) {
      // Parent handlers surface mutation errors via global toast feedback.
      console.error('Failed to claim appointment card action', error);
    } finally {
      setIsClaiming(false);
    }
  }, [appointment.id, onClaim]);

  const handleUnclaim = useCallback(async () => {
    setIsUnclaiming(true);
    try {
      await onUnclaim(appointment.id);
    } catch (error) {
      // Parent handlers surface mutation errors via global toast feedback.
      console.error('Failed to unclaim appointment card action', error);
    } finally {
      setIsUnclaiming(false);
    }
  }, [appointment.id, onUnclaim]);

  const cardClassName = `relative overflow-hidden rounded-2xl border border-arsm-border bg-arsm-card p-4 transition-all duration-200 hover:ring-2 hover:ring-arsm-focus-ring/45 dark:border-arsm-border-dark dark:bg-arsm-card-dark dark:hover:ring-arsm-focus-ring/30 flex flex-col gap-3.5${onClick ? ' cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/40' : ''}`;

  const cardContent: ReactNode = (
    <>
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 pb-1">
        <StatusBadge status={appointment.status} />
        <span className="truncate text-xs text-arsm-muted dark:text-arsm-muted-dark">{scheduleDateLabel}</span>
      </div>

      <div className="space-y-2 rounded-lg border border-arsm-border/65 bg-arsm-input/55 p-3 dark:border-arsm-border-dark/65 dark:bg-arsm-input-dark/55">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <h3 className="min-w-0 truncate text-sm font-semibold text-arsm-primary dark:text-arsm-primary-dark">{vehicleTitle}</h3>
          <span className="shrink-0 rounded-md border border-arsm-border bg-arsm-toggle-bg px-2 py-0.5 font-mono text-xs text-arsm-primary dark:border-arsm-border-dark dark:bg-arsm-toggle-bg-dark dark:text-arsm-primary-dark">
            {vehicle.licensePlate}
          </span>
        </div>

        <p className="line-clamp-2 text-sm text-arsm-label dark:text-arsm-label-dark">{appointment.taskDescription}</p>

        <div className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-arsm-border/70 bg-arsm-input/70 px-2.5 py-1.5 dark:border-arsm-border-dark/70 dark:bg-arsm-input-dark/70">
          <span className="inline-flex min-w-0 items-center gap-1 text-xs text-arsm-muted dark:text-arsm-muted-dark">
            <Clock3 className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{t('scheduler.due.label')}</span>
          </span>
          <span className={`min-w-0 truncate text-xs font-semibold ${dueState.toneClassName}`}>
            {t(dueState.labelKey, dueState.labelValues)}
          </span>
        </div>
      </div>

      <div className="mt-auto rounded-lg border border-arsm-border/70 bg-arsm-input/65 p-3 dark:border-arsm-border-dark/70 dark:bg-arsm-input-dark/65">
        <div className="min-w-0">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-arsm-muted dark:text-arsm-muted-dark">{t('scheduler.detail.mechanics')}</p>
          <div className="mb-2.5 flex flex-wrap items-center gap-2">
            {appointment.mechanics.map((mechanic) => (
              <div key={mechanic.id} className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-arsm-border/70 bg-arsm-card px-2 py-1 dark:border-arsm-border-dark/70 dark:bg-arsm-card-dark">
                <MechanicAvatar
                  mechanicId={mechanic.id}
                  fullName={mechanic.fullName}
                  hasProfilePicture={mechanic.hasProfilePicture}
                />
                <span className="max-w-[7rem] truncate text-[11px] text-arsm-label dark:text-arsm-label-dark">{mechanic.fullName}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex w-full flex-wrap items-center justify-end gap-2 border-t border-arsm-border/70 pt-3 dark:border-arsm-border-dark/70">
          {canClaimAppointment && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                void handleClaim();
              }}
              disabled={isClaiming}
              className={schedulerMiniPrimaryActionButtonClass}
            >
              {isClaiming ? '...' : (
                <>
                  <span className="truncate">{t('scheduler.claim')}</span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          )}

          {canUnclaimAppointment && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                void handleUnclaim();
              }}
              disabled={isUnclaiming}
              className={schedulerMiniDangerStrongActionButtonClass}
            >
              {isUnclaiming ? '...' : (
                <>
                  <span className="truncate">{t('scheduler.detail.unassignMe')}</span>
                  <LogOut className="h-3.5 w-3.5 shrink-0" />
                </>
              )}
            </button>
          )}

          {!canClaimAppointment && !canUnclaimAppointment && isAssigned && (
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
