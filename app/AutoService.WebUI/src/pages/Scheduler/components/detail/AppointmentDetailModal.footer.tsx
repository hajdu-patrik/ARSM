/** Footer for the appointment detail modal: edit, status, and admin-only delete controls. */
import { memo, useMemo } from 'react';
import type { TFunction } from 'i18next';
import { Save, Trash2 } from 'lucide-react';
import { Dropdown } from '../../../../components/common/Dropdown';
import type { AppointmentDto, AppointmentStatus } from '../../../../types/scheduler/scheduler.types';
import {
  defaultIconClass,
  equalWidthControlGroupClass,
  referenceChipDangerButtonClass,
  referenceChipPrimaryButtonClass,
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
  readonly isDeleting: boolean;
  readonly t: TFunction;
  readonly onStartEdit: () => void;
  readonly onSave: () => void;
  readonly onStatusChange: (status: AppointmentStatus) => void;
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
  const statusOptions = useMemo(() => STATUS_OPTIONS.map((status) => ({
    value: status,
    label: t(`scheduler.status.${status.toLowerCase()}`),
  })), [t]);
  const shouldRenderGlobalControls = isEditing || showEdit || canChangeStatus || isAdmin;

  if (!shouldRenderGlobalControls) {
    return null;
  }

  return (
    <div className={`${equalWidthControlGroupClass} w-full`}>
      {canChangeStatus && !isEditing && (
        <div className={selectWrapperClass}>
          <Dropdown
            value={appointment.status}
            options={statusOptions}
            onChange={(nextStatus) => {
              if (isAppointmentStatus(nextStatus)) {
                onStatusChange(nextStatus);
              }
            }}
            disabled={isUpdating}
            ariaLabel={t('scheduler.changeStatus')}
          />
        </div>
      )}

      {showEdit && !isEditing && (
        <button
          type="button"
          data-testid="appointment-detail-edit"
          onClick={onStartEdit}
          className={referenceChipPrimaryButtonClass}
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
          className={referenceChipDangerButtonClass}
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
          className={`${referenceChipPrimaryButtonClass} w-full`}
        >
          <Save className={defaultIconClass} />
          <span>{isSaving ? t('common.actions.saving') : t('common.actions.saveChanges')}</span>
        </button>
      )}
    </div>
  );
});
