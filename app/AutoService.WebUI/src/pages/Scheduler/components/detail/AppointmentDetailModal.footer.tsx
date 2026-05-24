/**
 * Footer component for appointment detail modal.
 * Handles global edit and status controls.
 * @module AppointmentDetailModal.footer
 */
import { memo } from 'react';
import type { TFunction } from 'i18next';
import { Save } from 'lucide-react';
import type { AppointmentDto, AppointmentStatus } from '../../../../types/scheduler/scheduler.types';
import {
  compactSelectFullClass,
  equalWidthControlGroupClass,
  mediumContextPrimaryButtonClass,
  selectWrapperClass,
} from '../../../../utils/formStyles';

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
  readonly isSaveEnabled: boolean;
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
  isSaveEnabled,
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
            className={compactSelectFullClass}
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
          className={mediumContextPrimaryButtonClass}
        >
          {t('scheduler.detail.edit')}
        </button>
      )}

      {isEditing && (
        <button
          type="button"
          data-testid="appointment-detail-save"
          onClick={onSave}
          disabled={isSaving || !isSaveEnabled}
          className={`${mediumContextPrimaryButtonClass} w-full`}
        >
          <Save className="h-4 w-4 shrink-0" />
          <span>{isSaving ? t('scheduler.detail.saving') : t('scheduler.detail.save')}</span>
        </button>
      )}
    </div>
  );
});
