/**
 * Footer component for appointment detail modal.
 * Handles edit, status change, assignment badge, and claim actions.
 * @module AppointmentDetailModal.footer
 */
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
  const isClosedForMechanicMutations = appointment.status === 'Cancelled' || appointment.status === 'Completed';
  const shouldRenderClaimButton = !isClosedForMechanicMutations && shouldShowClaimButton;

  return (
    <div className="flex w-full flex-wrap items-center gap-2">
      {canEdit && !isEditing && (
        <button
          data-testid="appointment-detail-edit"
          onClick={onStartEdit}
          className="w-full min-h-10 rounded-xl bg-arsm-accent px-4 py-2.5 text-sm font-semibold text-arsm-primary transition-all duration-200 hover:-translate-y-px hover:bg-arsm-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/40 dark:bg-arsm-accent-dark dark:text-arsm-hover dark:hover:bg-arsm-accent-dark-hover dark:focus-visible:ring-arsm-focus-ring/24 sm:w-auto sm:min-w-[10rem]"
        >
          {t('scheduler.detail.edit')}
        </button>
      )}

      {isEditing && (
        <>
          <button
            data-testid="appointment-detail-save"
            onClick={onSave}
            disabled={isSaving}
            className="min-h-10 rounded-xl bg-arsm-accent px-3.5 py-2 text-sm font-semibold text-arsm-primary transition-all duration-200 hover:-translate-y-px hover:bg-arsm-accent-hover disabled:cursor-not-allowed disabled:opacity-50 dark:bg-arsm-accent-dark dark:text-arsm-hover dark:hover:bg-arsm-accent-dark-hover"
          >
            {isSaving ? t('scheduler.detail.saving') : t('scheduler.detail.save')}
          </button>
          <button
            onClick={onCancelEdit}
            disabled={isSaving}
            className="min-h-10 rounded-xl border border-arsm-border bg-transparent px-3.5 py-2 text-sm font-medium text-arsm-label transition-all duration-200 hover:-translate-y-px hover:bg-arsm-toggle-bg disabled:cursor-not-allowed disabled:opacity-50 dark:border-arsm-border-dark dark:text-arsm-label-dark dark:hover:bg-arsm-toggle-bg-dark"
          >
            {t('scheduler.intake.cancel')}
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
          className="min-h-10 min-w-[11rem] flex-1 rounded-xl border border-arsm-border bg-arsm-input px-3 py-2 text-sm text-arsm-primary transition focus-visible:border-arsm-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/35 disabled:cursor-not-allowed disabled:opacity-50 dark:border-arsm-border-dark dark:bg-arsm-input-dark dark:text-arsm-primary-dark dark:focus-visible:ring-arsm-focus-ring/22"
        >
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {t(`scheduler.status.${status.toLowerCase()}`)}
            </option>
          ))}
        </select>
      )}

      {isAssigned && !isEditing && (
        <div className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-arsm-success-border/60 bg-arsm-success-bg px-3 py-1 text-sm font-semibold text-arsm-success-text dark:border-arsm-success-border-dark/60 dark:bg-arsm-success-bg-dark dark:text-arsm-success-text-dark">
          <Check className="h-4 w-4" />
          {t('scheduler.assigned')}
        </div>
      )}

      {!isEditing && shouldRenderClaimButton && (
        <div className="flex w-full justify-end">
          <button
            onClick={onClaim}
            disabled={isClaiming}
            className="rounded-lg bg-arsm-accent px-3 py-1.5 text-xs font-semibold text-arsm-primary transition-all duration-200 hover:-translate-y-px hover:bg-arsm-accent-hover disabled:cursor-not-allowed disabled:opacity-50 dark:bg-arsm-accent-dark dark:text-arsm-hover dark:hover:bg-arsm-accent-dark-hover"
          >
            {isClaiming ? '...' : t('scheduler.claim')}
          </button>
        </div>
      )}
    </div>
  );
});
