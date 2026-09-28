/**
 * Footer component for appointment detail modal.
 * Handles global edit, status, and (admin-only) delete controls.
 * @module AppointmentDetailModal.footer
 */
import { memo } from 'react';
import type { TFunction } from 'i18next';
import { Save, Trash2 } from 'lucide-react';
import type { AppointmentDto, AppointmentStatus } from '../../../../types/scheduler/scheduler.types';
import {
  compactSelectFullClass,
  defaultIconClass,
  equalWidthControlGroupClass,
  mediumContextDangerButtonClass,
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
  /** Whether the current user is an admin; only admins can delete an appointment. */
  readonly isAdmin: boolean;
  /** Whether the delete request is in flight. */
  readonly isDeleting: boolean;
  readonly t: TFunction;
  readonly onStartEdit: () => void;
  readonly onSave: () => void;
  readonly onStatusChange: (status: AppointmentStatus) => void;
  /** Opens the delete confirmation modal. */
  readonly onDeleteClick: () => void;
}

export const AppointmentDetailFooter = memo(function AppointmentDetailFooter({
  appointment,
  showEdit,
  isEditing,
  isSaving,
  isSaveEnabled,
  canChangeStatus,
  isUpdating,
  isAdmin,
  isDeleting,
  t,
  onStartEdit,
  onSave,
  onStatusChange,
  onDeleteClick,
}: AppointmentDetailFooterProps) {
  const shouldRenderGlobalControls = isEditing || showEdit || canChangeStatus || isAdmin;

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

      {isAdmin && !isEditing && (
        <button
          type="button"
          data-testid="appointment-detail-delete"
          onClick={onDeleteClick}
          disabled={isDeleting}
          className={mediumContextDangerButtonClass}
        >
          <Trash2 className={defaultIconClass} />
          <span>{t('scheduler.detail.delete')}</span>
        </button>
      )}

      {isEditing && (
        <button
          type="button"
          data-testid="appointment-detail-save"
          onClick={onSave}
          disabled={isSaving || !isSaveEnabled}
          aria-busy={isSaving}
          className={`${mediumContextPrimaryButtonClass} w-full`}
        >
          <Save className={defaultIconClass} />
          <span>{isSaving ? t('common.actions.saving') : t('common.actions.saveChanges')}</span>
        </button>
      )}
    </div>
  );
});
