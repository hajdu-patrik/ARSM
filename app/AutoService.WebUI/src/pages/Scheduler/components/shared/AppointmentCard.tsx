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
import { CompactOverflowBadge } from './CompactOverflowBadge';
import { getDueState } from '../../utils/due-date';

const ACTION_CLICK_SELECTOR = '[data-appointment-card-action="true"]';

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

  const handleCardClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!onClick) {
      return;
    }

    const targetElement = event.target as HTMLElement | null;
    if (targetElement?.closest(ACTION_CLICK_SELECTOR)) {
      return;
    }

    onClick();
  }, [onClick]);

  const isAssigned = currentMechanicId !== undefined
    && appointment.mechanics.some((mechanic) => mechanic.id === currentMechanicId);
  const dueState = getDueState(appointment.dueDateTime);
  const { vehicle } = appointment;
  const canClaimAppointment = !isAssigned && appointment.status === 'InProgress' && !dueState.isOverdue;
  const canUnclaimAppointment = isAssigned && appointment.status === 'InProgress';
  const vehicleTitle = `${vehicle.brand} ${vehicle.model} (${vehicle.year})`;
  const mobileVisibleMechanics = appointment.mechanics.slice(0, 1);
  const desktopVisibleMechanics = appointment.mechanics.slice(0, 2);
  const mobileOverflowCount = Math.max(appointment.mechanics.length - mobileVisibleMechanics.length, 0);
  const desktopOverflowCount = Math.max(appointment.mechanics.length - desktopVisibleMechanics.length, 0);

  const scheduleDateValue = new Date(appointment.scheduledDate);
  const hasValidScheduleDate = !Number.isNaN(scheduleDateValue.getTime());
  const dueDateValue = new Date(appointment.dueDateTime);
  const hasValidDueDate = !Number.isNaN(dueDateValue.getTime());

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

      <div className="space-y-3 rounded-lg border border-arsm-border/65 bg-arsm-input/55 p-3 dark:border-arsm-border-dark/65 dark:bg-arsm-input-dark/55">
        <div className="min-w-0 space-y-1">
          <h3 className="min-w-0 truncate text-sm font-semibold text-arsm-primary dark:text-arsm-primary-dark">{vehicleTitle}</h3>
          <p className="font-mono text-xs text-arsm-muted dark:text-arsm-muted-dark">{vehicle.licensePlate}</p>
        </div>

        <p className="line-clamp-2 text-sm text-arsm-label dark:text-arsm-label-dark">{appointment.taskDescription}</p>

        <div className="flex min-w-0 items-center gap-2 rounded-lg border border-arsm-border/70 bg-arsm-input/70 px-2.5 py-2 dark:border-arsm-border-dark/70 dark:bg-arsm-input-dark/70">
          <span className="inline-flex shrink-0 items-center gap-1 text-xs text-arsm-muted dark:text-arsm-muted-dark">
            <Clock3 className="h-3.5 w-3.5 shrink-0" />
            <span>{t('scheduler.due.label')}</span>
          </span>
          {hasValidDueDate && (
            <p className={`min-w-0 truncate text-xs font-semibold ${dueState.toneClassName}`}>{t(dueState.labelKey, dueState.labelValues)}</p>
          )}
        </div>

        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 pt-0.5 max-[350px]:items-start">
          <div className="flex min-w-0 items-center gap-1.5">
            <div className="flex min-w-0 items-center gap-1.5 pr-2 sm:hidden">
              {mobileVisibleMechanics.map((mechanic, index) => (
                <div key={mechanic.id} className="relative inline-flex shrink-0">
                  <MechanicAvatar
                    mechanicId={mechanic.id}
                    fullName={mechanic.fullName}
                    hasProfilePicture={mechanic.hasProfilePicture}
                    sizeClassName="h-7 w-7 text-[10px]"
                  />
                  {index === mobileVisibleMechanics.length - 1 && mobileOverflowCount > 0 && (
                    <CompactOverflowBadge count={mobileOverflowCount} />
                  )}
                </div>
              ))}
            </div>
            <div className="hidden min-w-0 items-center gap-1.5 pr-2 sm:flex">
              {desktopVisibleMechanics.map((mechanic, index) => (
                <div key={mechanic.id} className="relative inline-flex shrink-0">
                  <MechanicAvatar
                    mechanicId={mechanic.id}
                    fullName={mechanic.fullName}
                    hasProfilePicture={mechanic.hasProfilePicture}
                    sizeClassName="h-7 w-7 text-[10px]"
                  />
                  {index === desktopVisibleMechanics.length - 1 && desktopOverflowCount > 0 && (
                    <CompactOverflowBadge count={desktopOverflowCount} />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex shrink-0 items-center self-center">
            {canClaimAppointment && (
              <button
                type="button"
                data-appointment-card-action="true"
                onClick={(event) => {
                  event.stopPropagation();
                  void handleClaim();
                }}
                disabled={isClaiming}
                className={`${schedulerMiniPrimaryActionButtonClass} min-h-8 px-2 py-1`}
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
                data-appointment-card-action="true"
                onClick={(event) => {
                  event.stopPropagation();
                  void handleUnclaim();
                }}
                disabled={isUnclaiming}
                className={`${schedulerMiniDangerStrongActionButtonClass} min-h-8 px-2 py-1`}
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
              <div className="inline-flex min-w-0 items-center gap-1 rounded-full border border-arsm-success-border/65 bg-arsm-success-bg px-2 py-0.5 text-[10px] font-semibold text-arsm-success-text dark:border-arsm-success-border-dark/65 dark:bg-arsm-success-bg-dark dark:text-arsm-success-text-dark">
                <Check className="h-3 w-3 shrink-0" />
                <span className="truncate">{t('scheduler.assigned')}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
  if (onClick) {
    return (
      <div
        className={`${cardClassName} relative w-full cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/40`}
        role="button"
        tabIndex={0}
        onClick={handleCardClick}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
        aria-label={t('scheduler.detail.title')}
      >
        {cardContent}
      </div>
    );
  }

  return <div className={cardClassName}>{cardContent}</div>;
});

AppointmentCardComponent.displayName = 'AppointmentCard';
export const AppointmentCard = AppointmentCardComponent;
