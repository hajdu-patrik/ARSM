/**
 * Appointment card component for scheduler grid/list views.
 * @module AppointmentCard
 */
import { memo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock3, LogOut, UserPlus } from 'lucide-react';
import type { AppointmentDto } from '../../../../types/scheduler/scheduler.types';
import {
  compactItemTitleTextClass,
  contentCardFrameClass,
  mutedBodyTextClass,
  mutedMetaTextClass,
  schedulerInlineClaimButtonClass,
  schedulerInlineUnassignButtonClass,
} from '../../../../utils/formStyles';
import { StatusBadge } from './StatusBadge';
import { MechanicAvatar } from './MechanicAvatar';
import { CompactOverflowBadge } from './CompactOverflowBadge';
import { getDueState } from '../../utils/due-date';
import { AppointmentCardActionModals } from './AppointmentCardActionModals';
import { useAppointmentCardActions } from './useAppointmentCardActions';

interface AppointmentCardProps {
  readonly appointment: AppointmentDto;
  readonly currentMechanicId: number | undefined;
  readonly isAdmin: boolean;
  readonly onClaim: (id: number) => Promise<void>;
  readonly onUnclaim: (id: number) => Promise<void>;
  readonly onClick?: () => void;
}

const AppointmentCardComponent = memo(function AppointmentCard({
  appointment,
  currentMechanicId,
  isAdmin,
  onClaim,
  onUnclaim,
  onClick,
}: AppointmentCardProps) {
  const { t, i18n } = useTranslation();
  const isAssigned = currentMechanicId !== undefined
    && appointment.mechanics.some((mechanic) => mechanic.id === currentMechanicId);
  const dueState = getDueState(appointment.dueDateTime);
  const { vehicle } = appointment;
  const canClaimAppointment = !isAdmin && !isAssigned && appointment.status === 'InProgress';
  const canUnclaimAppointment = !isAdmin && isAssigned && appointment.status === 'InProgress' && appointment.mechanics.length > 1;
  const showMechanicAction = canClaimAppointment || canUnclaimAppointment;
  const vehicleTitle = `${vehicle.brand} ${vehicle.model} (${vehicle.year})`;
  const visibleMechanics = appointment.mechanics.slice(0, 2);
  const overflowCount = Math.max(appointment.mechanics.length - visibleMechanics.length, 0);

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

  const cardActions = useAppointmentCardActions({
    appointmentId: appointment.id,
    canClaimAppointment,
    canUnclaimAppointment,
    onClaim,
    onUnclaim,
  });

  const {
    isClaiming,
    isUnclaiming,
    isClaimConfirmOpen,
    isUnclaimConfirmOpen,
    handleClaim,
    handleOpenClaimConfirm,
    handleUnclaim,
    handleOpenUnclaimConfirm,
    closeClaimConfirm,
    closeUnclaimConfirm,
  } = cardActions;

  const cardClassName = `relative flex flex-col gap-3.5 p-4 transition-all duration-200 hover:ring-2 hover:ring-arsm-focus-ring/45 dark:hover:ring-arsm-focus-ring/30 ${contentCardFrameClass}${onClick ? ' cursor-pointer' : ''}`;
  const cardContentClassName = onClick ? 'pointer-events-none relative z-10 flex flex-col gap-3.5' : 'flex flex-col gap-3.5';

  const cardContent: ReactNode = (
    <div className={cardContentClassName}>
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 pb-1">
        <StatusBadge status={appointment.status} />
        <span className={`truncate ${mutedMetaTextClass}`}>{scheduleDateLabel}</span>
      </div>

      <div className="min-w-0 space-y-3">
        <div className="min-w-0 space-y-1">
          <h3 className={compactItemTitleTextClass}>{vehicleTitle}</h3>
          <p className={`font-mono ${mutedMetaTextClass}`}>{vehicle.licensePlate}</p>
        </div>

        <p className={`line-clamp-2 ${mutedBodyTextClass}`}>{appointment.taskDescription}</p>

        <div className="flex min-w-0 items-center gap-2 rounded-lg border border-arsm-border/70 bg-arsm-input/70 px-2.5 py-2 dark:border-arsm-border-dark/70 dark:bg-arsm-input-dark/70">
          <span className={`inline-flex shrink-0 items-center gap-1 ${mutedMetaTextClass}`}>
            <Clock3 className="h-3.5 w-3.5 shrink-0" />
            <span>{t('scheduler.due.label')}</span>
          </span>
          {hasValidDueDate && (
            <p className={`min-w-0 truncate text-xs font-semibold ${dueState.toneClassName}`}>{t(dueState.labelKey, dueState.labelValues)}</p>
          )}
        </div>

        <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2 overflow-visible pt-0.5 sm:flex-nowrap">
          <div className="flex h-7 min-w-[4.75rem] max-w-[4.75rem] shrink-0 items-center gap-1.5 overflow-visible pr-1">
              {visibleMechanics.map((mechanic, index) => (
                <div key={mechanic.id} className="relative inline-flex shrink-0">
                  <MechanicAvatar
                    mechanicId={mechanic.id}
                    fullName={mechanic.fullName}
                    hasProfilePicture={mechanic.hasProfilePicture}
                    sizeClassName="h-7 w-7 text-[10px]"
                  />
                  {index === visibleMechanics.length - 1 && overflowCount > 0 && (
                    <CompactOverflowBadge count={overflowCount} />
                  )}
                </div>
              ))}
          </div>

          {showMechanicAction && (
            <div className="pointer-events-auto relative z-20 ml-auto flex min-w-0 shrink-0 items-center self-center max-[350px]:ml-0 max-[350px]:w-full max-[350px]:justify-end">
              {canClaimAppointment && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleOpenClaimConfirm();
                  }}
                  disabled={isClaiming}
                  className={schedulerInlineClaimButtonClass}
                >
                  {isClaiming ? <span className="truncate">{t('scheduler.detail.claiming')}</span> : (
                    <>
                      <span className="truncate">{t('scheduler.claim')}</span>
                      <UserPlus className="h-3.5 w-3.5 shrink-0" />
                    </>
                  )}
                </button>
              )}

              {canUnclaimAppointment && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleOpenUnclaimConfirm();
                  }}
                  disabled={isUnclaiming}
                  className={schedulerInlineUnassignButtonClass}
                >
                  {isUnclaiming ? <span className="truncate">{t('scheduler.detail.unassigning')}</span> : (
                    <>
                      <span className="truncate">{t('scheduler.detail.unassignMe')}</span>
                      <LogOut className="h-3.5 w-3.5 shrink-0" />
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const cardElement = (
    <div className={cardClassName}>
      {onClick && (
        <button
          type="button"
          onClick={onClick}
          aria-label={t('scheduler.detail.title')}
          className="absolute inset-0 z-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/40"
        />
      )}
      {cardContent}
    </div>
  );

  return (
    <>
      {cardElement}
      <AppointmentCardActionModals
        isClaimConfirmOpen={isClaimConfirmOpen}
        isUnclaimConfirmOpen={isUnclaimConfirmOpen}
        isClaiming={isClaiming}
        isUnclaiming={isUnclaiming}
        onCloseClaimConfirm={closeClaimConfirm}
        onCloseUnclaimConfirm={closeUnclaimConfirm}
        onConfirmClaim={() => { handleClaim().catch(() => undefined); }}
        onConfirmUnclaim={() => { handleUnclaim().catch(() => undefined); }}
      />
    </>
  );
});

AppointmentCardComponent.displayName = 'AppointmentCard';
export const AppointmentCard = AppointmentCardComponent;
