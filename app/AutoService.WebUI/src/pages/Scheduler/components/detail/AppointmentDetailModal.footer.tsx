import { memo } from 'react';
import { Check } from 'lucide-react';
import type { TFunction } from 'i18next';
import type { AppointmentDto, AppointmentStatus } from '../../../../types/scheduler/scheduler.types';

const STATUS_OPTIONS: AppointmentStatus[] = ['InProgress', 'Completed', 'Cancelled'];
const STATUS_OPTIONS_SET = new Set<string>(STATUS_OPTIONS);

function isAppointmentStatus(value: string): value is AppointmentStatus {
  return STATUS_OPTIONS_SET.has(value);
}

interface AppointmentDetailFooterProps {
  readonly appointment: AppointmentDto;
  readonly canEdit: boolean;
  readonly isEditing: boolean;
  readonly isSaving: boolean;
  readonly isAssigned: boolean;
  readonly canChangeStatus: boolean;
  readonly isUpdating: boolean;
  readonly shouldShowClaimButton: boolean;
  readonly isClaiming: boolean;
  readonly t: TFunction;
  readonly onStartEdit: () => void;
  readonly onCancelEdit: () => void;
  readonly onSave: () => void;
  readonly onStatusChange: (status: AppointmentStatus) => void;
  readonly onClaim: () => void;
}

export const AppointmentDetailFooter = memo(function AppointmentDetailFooter({
  appointment,
  canEdit,
  isEditing,
  isSaving,
  isAssigned,
  canChangeStatus,
  isUpdating,
  shouldShowClaimButton,
  isClaiming,
  t,
  onStartEdit,
  onCancelEdit,
  onSave,
  onStatusChange,
  onClaim,
}: AppointmentDetailFooterProps) {
  return (
    <div className="flex w-full flex-wrap items-center gap-2">
      {canEdit && !isEditing && (
        <button
          data-testid="appointment-detail-edit"
          onClick={onStartEdit}
          className="w-full rounded-xl bg-arsm-accent px-4 py-2 text-sm font-semibold text-arsm-primary transition-colors hover:bg-arsm-accent-hover dark:bg-arsm-accent-dark dark:text-arsm-hover dark:hover:bg-arsm-accent-dark-hover sm:w-auto sm:min-w-[10rem]"
        >
          {t('scheduler.detail.edit')}
        </button>
      )}

      {isEditing && (
        <>
          <button
            onClick={onCancelEdit}
            disabled={isSaving}
            className="rounded-xl border border-arsm-border px-3 py-1.5 text-sm font-medium text-arsm-primary transition-colors hover:bg-arsm-accent-subtle disabled:opacity-50 dark:border-arsm-border-dark dark:text-arsm-primary-dark dark:hover:bg-arsm-hover-dark"
          >
            {t('scheduler.intake.cancel')}
          </button>
          <button
            data-testid="appointment-detail-save"
            onClick={onSave}
            disabled={isSaving}
            className="rounded-xl bg-arsm-accent px-3 py-1.5 text-sm font-semibold text-arsm-primary transition-colors hover:bg-arsm-accent-hover disabled:opacity-50 dark:bg-arsm-accent-dark dark:text-arsm-hover dark:hover:bg-arsm-accent-dark-hover"
          >
            {isSaving ? t('scheduler.detail.saving') : t('scheduler.detail.save')}
          </button>
        </>
      )}

      {canChangeStatus && !isEditing && (
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
          className="min-w-[11rem] flex-1 rounded-lg border border-arsm-border bg-arsm-input px-2 py-1.5 text-sm text-arsm-primary disabled:opacity-50 focus:outline-none dark:border-arsm-border-dark dark:bg-arsm-input-dark dark:text-arsm-primary-dark"
        >
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {t(`scheduler.status.${status.toLowerCase()}`)}
            </option>
          ))}
        </select>
      )}

      {isAssigned && !isEditing && (
        <div className="inline-flex items-center gap-1.5 text-sm font-medium text-green-600 dark:text-green-400">
          <Check className="h-4 w-4" />
          {t('scheduler.assigned')}
        </div>
      )}

      {!isEditing && shouldShowClaimButton && (
        <div className="flex w-full justify-center">
          <button
            onClick={onClaim}
            disabled={isClaiming}
            className="w-full rounded-xl bg-arsm-accent py-2 text-sm font-medium text-arsm-primary transition-colors hover:bg-arsm-accent-hover disabled:opacity-50 dark:bg-arsm-accent-dark dark:text-arsm-hover dark:hover:bg-arsm-accent-dark-hover"
          >
            {isClaiming ? '...' : t('scheduler.claim')}
          </button>
        </div>
      )}
    </div>
  );
});
