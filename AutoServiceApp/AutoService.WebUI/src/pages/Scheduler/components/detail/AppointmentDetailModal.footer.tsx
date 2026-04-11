import { memo } from 'react';
import { Check } from 'lucide-react';
import type { TFunction } from 'i18next';
import type { AppointmentDto, AppointmentStatus } from '../../../../types/scheduler/scheduler.types';

const STATUS_OPTIONS: AppointmentStatus[] = ['InProgress', 'Completed', 'Cancelled'];

interface AppointmentDetailFooterProps {
  readonly appointment: AppointmentDto;
  readonly canEdit: boolean;
  readonly isEditing: boolean;
  readonly isSaving: boolean;
  readonly isAssigned: boolean;
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
          onClick={onStartEdit}
          className="w-full rounded-xl bg-[#C9B3FF] px-4 py-2 text-sm font-semibold text-[#2C2440] transition-colors hover:bg-[#BFA6F7] dark:bg-[#7A66C7] dark:text-[#F5F2FF] dark:hover:bg-[#8A75D6] sm:w-auto sm:min-w-[10rem]"
        >
          {t('scheduler.detail.edit')}
        </button>
      )}

      {isEditing && (
        <>
          <button
            onClick={onCancelEdit}
            disabled={isSaving}
            className="rounded-xl border border-[#D8D2E9] px-3 py-1.5 text-sm font-medium text-[#2C2440] transition-colors hover:bg-[#E6DCF8] disabled:opacity-50 dark:border-[#3A3154] dark:text-[#EDE8FA] dark:hover:bg-[#322B47]"
          >
            {t('scheduler.intake.cancel')}
          </button>
          <button
            onClick={onSave}
            disabled={isSaving}
            className="rounded-xl bg-[#C9B3FF] px-3 py-1.5 text-sm font-semibold text-[#2C2440] transition-colors hover:bg-[#BFA6F7] disabled:opacity-50 dark:bg-[#7A66C7] dark:text-[#F5F2FF] dark:hover:bg-[#8A75D6]"
          >
            {isSaving ? t('scheduler.detail.saving') : t('scheduler.detail.save')}
          </button>
        </>
      )}

      {isAssigned && !isEditing && (
        <select
          value={appointment.status}
          onChange={(event) => onStatusChange(event.target.value as AppointmentStatus)}
          disabled={isUpdating}
          className="min-w-[11rem] flex-1 rounded-lg border border-[#D8D2E9] bg-[#F6F4FB] px-2 py-1.5 text-sm text-[#2C2440] disabled:opacity-50 focus:outline-none dark:border-[#3A3154] dark:bg-[#1A1A25] dark:text-[#EDE8FA]"
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
        <button
          onClick={onClaim}
          disabled={isClaiming}
          className="w-full rounded-xl bg-[#C9B3FF] py-2 text-sm font-medium text-[#2C2440] transition-colors hover:bg-[#BFA6F7] disabled:opacity-50 dark:bg-[#7A66C7] dark:text-[#F5F2FF] dark:hover:bg-[#8A75D6] sm:w-auto sm:min-w-[10rem]"
        >
          {isClaiming ? '...' : t('scheduler.claim')}
        </button>
      )}
    </div>
  );
});
