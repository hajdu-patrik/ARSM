/**
 * Footer component for appointment detail modal.
 * Handles global edit and status controls.
 * @module AppointmentDetailModal.footer
 */
import { memo } from 'react';
import type { TFunction } from 'i18next';
import type { AppointmentDto, AppointmentStatus } from '../../../../types/scheduler/scheduler.types';
import { buttonClass, compactSelectFullClass, equalWidthControlGroupClass, selectWrapperClass } from '../../../../utils/formStyles';

const STATUS_OPTIONS: AppointmentStatus[] = ['InProgress', 'Completed', 'Cancelled'];
const STATUS_OPTIONS_SET = new Set<string>(STATUS_OPTIONS);
const footerTopControlClass = 'h-10 min-h-10 rounded-xl px-3 py-2 text-sm';

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
  onSave,
  onStatusChange,
}: AppointmentDetailFooterProps) {
  const shouldRenderGlobalControls = isEditing || showEdit || canChangeStatus;

  if (!shouldRenderGlobalControls) {
    return null;
  }

  return (
    <div className={`${equalWidthControlGroupClass} w-full`}>
      {canChangeStatus && !isEditing && (
        <div className={selectWrapperClass}>
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
            className={`${compactSelectFullClass} ${footerTopControlClass}`}
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {t(`scheduler.status.${status.toLowerCase()}`)}
              </option>
            ))}
          </select>
        </div>
      )}

      {showEdit && !isEditing && (
        <button
          type="button"
          data-testid="appointment-detail-edit"
          onClick={onStartEdit}
          className={`${buttonClass} ${footerTopControlClass}`}
        >
          {t('scheduler.detail.edit')}
        </button>
      )}

      {isEditing && (
        <button
          type="button"
          data-testid="appointment-detail-save"
          onClick={onSave}
          disabled={isSaving}
          className={`${buttonClass} w-full`}
        >
          {isSaving ? t('scheduler.detail.saving') : t('scheduler.detail.save')}
        </button>
      )}
    </div>
  );
});
