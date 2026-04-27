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
          className="w-full rounded-xl bg-arsm-accent px-4 py-2.5 text-sm font-semibold text-arsm-primary shadow-[0_10px_24px_rgba(111,84,173,0.28)] transition-all duration-200 hover:-translate-y-px hover:bg-arsm-accent-hover hover:shadow-[0_14px_28px_rgba(111,84,173,0.32)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/40 dark:bg-arsm-accent-dark dark:text-arsm-hover dark:shadow-[0_12px_24px_rgba(8,10,20,0.5)] dark:hover:bg-arsm-accent-dark-hover dark:hover:shadow-[0_16px_30px_rgba(8,10,20,0.58)] dark:focus-visible:ring-arsm-focus-ring/24 sm:w-auto sm:min-w-[10rem]"
        >
          {t('scheduler.detail.edit')}
        </button>
      )}

      {isEditing && (
        <>
          <button
            onClick={onCancelEdit}
            disabled={isSaving}
            className="rounded-xl border border-arsm-border bg-transparent px-3.5 py-2 text-sm font-medium text-arsm-label transition-all duration-200 hover:-translate-y-px hover:bg-arsm-toggle-bg hover:shadow-[0_6px_16px_rgba(45,36,64,0.08)] disabled:cursor-not-allowed disabled:opacity-50 dark:border-arsm-border-dark dark:text-arsm-label-dark dark:hover:bg-arsm-toggle-bg-dark dark:hover:shadow-[0_6px_16px_rgba(3,5,14,0.28)]"
          >
            {t('scheduler.intake.cancel')}
          </button>
          <button
            data-testid="appointment-detail-save"
            onClick={onSave}
            disabled={isSaving}
            className="rounded-xl bg-arsm-accent px-3.5 py-2 text-sm font-semibold text-arsm-primary shadow-[0_8px_20px_rgba(111,84,173,0.24)] transition-all duration-200 hover:-translate-y-px hover:bg-arsm-accent-hover hover:shadow-[0_12px_24px_rgba(111,84,173,0.3)] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none dark:bg-arsm-accent-dark dark:text-arsm-hover dark:shadow-[0_10px_20px_rgba(8,10,20,0.46)] dark:hover:bg-arsm-accent-dark-hover dark:hover:shadow-[0_12px_24px_rgba(8,10,20,0.54)]"
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
          className="min-w-[11rem] flex-1 rounded-xl border border-arsm-border bg-arsm-input px-3 py-2 text-sm text-arsm-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] transition focus-visible:border-arsm-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/35 disabled:cursor-not-allowed disabled:opacity-50 dark:border-arsm-border-dark dark:bg-arsm-input-dark dark:text-arsm-primary-dark dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] dark:focus-visible:ring-arsm-focus-ring/22"
        >
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {t(`scheduler.status.${status.toLowerCase()}`)}
            </option>
          ))}
        </select>
      )}

      {isAssigned && !isEditing && (
        <div className="inline-flex items-center gap-1.5 rounded-full border border-arsm-success-border/60 bg-arsm-success-bg px-3 py-1 text-sm font-semibold text-arsm-success-text shadow-[0_6px_14px_rgba(34,197,94,0.12)] dark:border-arsm-success-border-dark/60 dark:bg-arsm-success-bg-dark dark:text-arsm-success-text-dark dark:shadow-[0_6px_14px_rgba(12,18,14,0.35)]">
          <Check className="h-4 w-4" />
          {t('scheduler.assigned')}
        </div>
      )}

      {!isEditing && shouldShowClaimButton && (
        <div className="flex w-full justify-center">
          <button
            onClick={onClaim}
            disabled={isClaiming}
            className="w-full rounded-xl bg-arsm-accent py-2.5 text-sm font-semibold text-arsm-primary shadow-[0_10px_24px_rgba(111,84,173,0.28)] transition-all duration-200 hover:-translate-y-px hover:bg-arsm-accent-hover hover:shadow-[0_14px_28px_rgba(111,84,173,0.32)] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none dark:bg-arsm-accent-dark dark:text-arsm-hover dark:shadow-[0_12px_24px_rgba(8,10,20,0.5)] dark:hover:bg-arsm-accent-dark-hover dark:hover:shadow-[0_16px_30px_rgba(8,10,20,0.58)]"
          >
            {isClaiming ? '...' : t('scheduler.claim')}
          </button>
        </div>
      )}
    </div>
  );
});
