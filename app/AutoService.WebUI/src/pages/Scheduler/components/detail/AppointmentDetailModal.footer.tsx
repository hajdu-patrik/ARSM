/**
 * Footer component for appointment detail modal.
 * Handles global edit and status controls.
 * @module AppointmentDetailModal.footer
 */
import { memo } from 'react';
import type { TFunction } from 'i18next';
import type { AppointmentDto, AppointmentStatus } from '../../../../types/scheduler/scheduler.types';
import { buttonClass, secondaryButtonClass } from '../../../../utils/formStyles';

const STATUS_OPTIONS: AppointmentStatus[] = ['InProgress', 'Completed', 'Cancelled'];
const STATUS_OPTIONS_SET = new Set<string>(STATUS_OPTIONS);

function isAppointmentStatus(value: string): value is AppointmentStatus {
  return STATUS_OPTIONS_SET.has(value);
}

interface AppointmentDetailFooterProps {
  readonly appointment: AppointmentDto;
  readonly showEdit: boolean;
  readonly isEditing: boolean;
  readonly isSaving: boolean;
  readonly canChangeStatus: boolean;
  readonly isUpdating: boolean;
  readonly t: TFunction;
  readonly onStartEdit: () => void;
  readonly onCancelEdit: () => void;
  readonly onSave: () => void;
  readonly onStatusChange: (status: AppointmentStatus) => void;
}

export const AppointmentDetailFooter = memo(function AppointmentDetailFooter({
  appointment,
  showEdit,
  isEditing,
  isSaving,
  canChangeStatus,
  isUpdating,
  t,
  onStartEdit,
  onCancelEdit,
  onSave,
  onStatusChange,
}: AppointmentDetailFooterProps) {
  const shouldRenderGlobalControls = isEditing || showEdit || canChangeStatus;

  if (!shouldRenderGlobalControls) {
    return null;
  }

  return (
    <div className="flex min-w-0 w-full flex-wrap items-center gap-2">
      {showEdit && !isEditing && (
        <button
          type="button"
          data-testid="appointment-detail-edit"
          onClick={onStartEdit}
          className={`${buttonClass} w-full px-4 py-2.5 sm:w-auto sm:min-w-[10rem]`}
        >
          {t('scheduler.detail.edit')}
        </button>
      )}

      {isEditing && (
        <>
          <button
            type="button"
            data-testid="appointment-detail-save"
            onClick={onSave}
            disabled={isSaving}
            className={`${buttonClass} px-3.5 py-2`}
          >
            {isSaving ? t('scheduler.detail.saving') : t('scheduler.detail.save')}
          </button>
          <button
            type="button"
            onClick={onCancelEdit}
            disabled={isSaving}
            className={`${secondaryButtonClass} px-3.5 py-2`}
          >
            {t('scheduler.intake.cancel')}
          </button>
        </>
      )}

      {canChangeStatus && !isEditing && (
        <div className="min-w-0 flex-1 overflow-hidden">
          <select
            value={appointment.status}
            onChange={(event) => {
              const nextStatus = event.target.value;
              if (isAppointmentStatus(nextStatus)) {
                onStatusChange(nextStatus);
              }
            }}
            disabled={isUpdating}
            aria-label={t('scheduler.changeStatus')}
            className="min-h-11 w-full min-w-0 max-w-full truncate rounded-xl border border-arsm-border bg-arsm-input px-3 py-2 text-sm text-arsm-primary transition focus-visible:border-arsm-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/35 disabled:cursor-not-allowed disabled:opacity-50 dark:border-arsm-border-dark dark:bg-arsm-input-dark dark:text-arsm-primary-dark dark:focus-visible:ring-arsm-focus-ring/22"
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {t(`scheduler.status.${status.toLowerCase()}`)}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
});
