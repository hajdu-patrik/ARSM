import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { AppointmentStatus } from '../../../types/scheduler.types';

interface StatusBadgeProps {
  readonly status: AppointmentStatus;
  readonly className?: string;
}

const STATUS_COLORS: Record<AppointmentStatus, string> = {
  InProgress: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  Completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  Cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

const STATUS_I18N_KEY: Record<AppointmentStatus, string> = {
  InProgress: 'scheduler.status.inprogress',
  Completed: 'scheduler.status.completed',
  Cancelled: 'scheduler.status.cancelled',
};

const StatusBadgeComponent = memo(function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const { t } = useTranslation();

  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[status]} ${className}`}>
      {t(STATUS_I18N_KEY[status])}
    </span>
  );
});

StatusBadgeComponent.displayName = 'StatusBadge';

export const StatusBadge = StatusBadgeComponent;