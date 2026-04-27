/**
 * Colored status pill badge for appointment status display.
 * Maps each {@link AppointmentStatus} to a distinct color scheme
 * and renders the localized status label.
 * @module StatusBadge
 */
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { AppointmentStatus } from '../../../../types/scheduler/scheduler.types';

/** Props for the {@link StatusBadge} component. */
interface StatusBadgeProps {
  /** The appointment status to display. */
  readonly status: AppointmentStatus;
  /** Additional CSS classes appended to the badge element. */
  readonly className?: string;
}

/** Tailwind color classes for each appointment status (light + dark mode). */
const STATUS_COLORS: Record<AppointmentStatus, string> = {
  InProgress: 'bg-arsm-warning-bg text-arsm-warning-text border-arsm-warning-border/70 dark:bg-arsm-warning-bg-dark dark:text-arsm-warning-text-dark dark:border-arsm-warning-border-dark/70',
  Completed: 'bg-arsm-success-soft text-arsm-success-text border-arsm-success-border/70 dark:bg-arsm-success-bg-dark dark:text-arsm-success-text-dark dark:border-arsm-success-border-dark/70',
  Cancelled: 'bg-arsm-error-soft text-arsm-error-text border-arsm-error-border/70 dark:bg-arsm-error-bg-dark dark:text-arsm-error-text-light dark:border-arsm-error-dark/70',
};

/** Dot color classes for each appointment status. */
const STATUS_DOT: Record<AppointmentStatus, string> = {
  InProgress: 'bg-arsm-warning-accent',
  Completed: 'bg-arsm-success-accent',
  Cancelled: 'bg-arsm-error-accent',
};

/** i18n translation key for each appointment status label. */
const STATUS_I18N_KEY: Record<AppointmentStatus, string> = {
  InProgress: 'scheduler.status.inprogress',
  Completed: 'scheduler.status.completed',
  Cancelled: 'scheduler.status.cancelled',
};

const StatusBadgeComponent = memo(function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const { t } = useTranslation();

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide ${STATUS_COLORS[status]} ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status]}`} aria-hidden="true" />
      {t(STATUS_I18N_KEY[status])}
    </span>
  );
});

StatusBadgeComponent.displayName = 'StatusBadge';

/** Memoized colored status pill badge. */
export const StatusBadge = StatusBadgeComponent;
