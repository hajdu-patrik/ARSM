/** Appointment card component for scheduler grid/list views. */
import { memo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock3, LogOut, UserPlus } from 'lucide-react';
import type { AppointmentDto } from '../../../../types/scheduler/scheduler.types';
import {
  compactHeaderRowClass,
  compactItemTitleClampTextClass,
  contentCardFrameClass,
  mutedBodyTextClass,
  mutedMetaTextClass,
  smallIconClass,
} from '../../../../utils/formStyles';
import { formatShortDateTime } from '../../../../utils/intlFormat';
import { schedulerChipLabelClass, schedulerInlineClaimButtonClass, schedulerInlineUnassignButtonClass } from '../../utils/schedulerButtonStyles';
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

/** Focus outline of the full-card overlay button, inset (-2px) because the card's overflow-hidden would clip an outer one. */
const overlayFocusOutlineClass = 'arsm-focus-outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ui-focus';

export const AppointmentCard = memo(function AppointmentCard({
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
  const dueState = getDueState(appointment.dueDateTime, appointment.status);
  const { vehicle } = appointment;
  const canClaimAppointment = !isAdmin && !isAssigned && appointment.status === 'InProgress';
  const canUnclaimAppointment = !isAdmin && isAssigned && appointment.status === 'InProgress' && appointment.mechanics.length > 1;
  const showMechanicAction = canClaimAppointment || canUnclaimAppointment;
  const vehicleTitle = `${vehicle.brand} ${vehicle.model} (${String(vehicle.year)})`;
  const visibleMechanics = appointment.mechanics.slice(0, 2);
  const overflowCount = Math.max(appointment.mechanics.length - visibleMechanics.length, 0);

  const scheduleDateValue = new Date(appointment.scheduledDate);
  const hasValidScheduleDate = !Number.isNaN(scheduleDateValue.getTime());
  const dueDateValue = new Date(appointment.dueDateTime);
  const hasValidDueDate = !Number.isNaN(dueDateValue.getTime());

  const scheduleDateLabel = hasValidScheduleDate
    ? formatShortDateTime(scheduleDateValue, i18n.language)
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

  const cardClassName = `relative flex flex-col gap-3.5 p-4 transition-[background-color,border-color,color,transform] duration-200 hover:outline-2 hover:outline-arsm-focus-ring/45 dark:hover:outline-arsm-focus-ring/30 ${contentCardFrameClass}${onClick ? ' cursor-pointer' : ''}`;
  const cardContentClassName = onClick ? 'pointer-events-none relative z-10 flex flex-col gap-3.5' : 'flex flex-col gap-3.5';

  const cardContent: ReactNode = (
    <div className={cardContentClassName}>
      <div className={`${compactHeaderRowClass} pb-1`}>
        <StatusBadge status={appointment.status} />
        <span className={`min-w-0 [overflow-wrap:anywhere] ${mutedMetaTextClass}`}>{scheduleDateLabel}</span>
      </div>

      <div className="min-w-0 space-y-3">
        <div className="min-w-0 space-y-1">
          <h3 className={compactItemTitleClampTextClass}>{vehicleTitle}</h3>
          <p className={`font-mono ${mutedMetaTextClass}`}>{vehicle.licensePlate}</p>
        </div>

        <p className={`line-clamp-2 ${mutedBodyTextClass}`}>{appointment.taskDescription}</p>

        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-ui-border/70 bg-ui-input/70 px-2.5 py-2">
          <span className={`inline-flex shrink-0 items-center gap-1 ${mutedMetaTextClass}`}>
            <Clock3 className={smallIconClass} />
            <span>{t('scheduler.due.label')}</span>
          </span>
          {hasValidDueDate && (
            <p className={`min-w-0 text-xs font-semibold [overflow-wrap:anywhere] ${dueState.toneClassName}`}>
              {dueState.labelValues === undefined
                ? t(dueState.labelKey)
                : t(dueState.labelKey, dueState.labelValues)}
            </p>
          )}
        </div>

        <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2 overflow-visible pt-0.5">
          <div className="flex h-7 shrink-0 items-center gap-1.5">
            {visibleMechanics.map((mechanic) => (
              <MechanicAvatar
                key={mechanic.id}
                mechanicId={mechanic.id}
                fullName={mechanic.fullName}
                hasProfilePicture={mechanic.hasProfilePicture}
                sizeClassName="h-7 w-7 text-xs"
              />
            ))}
            {overflowCount > 0 && <CompactOverflowBadge count={overflowCount} />}
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
                  {isClaiming ? <span className={schedulerChipLabelClass}>{t('scheduler.detail.claiming')}</span> : (
                    <>
                      <span className={schedulerChipLabelClass}>{t('scheduler.claim')}</span>
                      <UserPlus className={smallIconClass} />
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
                  {isUnclaiming ? <span className={schedulerChipLabelClass}>{t('scheduler.detail.unassigning')}</span> : (
                    <>
                      <span className={schedulerChipLabelClass}>{t('scheduler.detail.unassignMe')}</span>
                      <LogOut className={smallIconClass} />
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
          className={`absolute inset-0 z-0 rounded-2xl ${overlayFocusOutlineClass}`}
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
