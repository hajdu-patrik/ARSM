/** Colored status pill badge: maps {@link AppointmentStatus} to its semantic tone and localized label. */
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { StatusPillBadge } from '../../../../components/common/StatusPillBadge';
import type { AppointmentStatus } from '../../../../types/scheduler/scheduler.types';
import { toneBadgeClasses, toneDotClasses } from '../../../../utils/formStyles';
import { APPOINTMENT_STATUS_TONE } from '../../utils/appointmentStatusTone';

interface StatusBadgeProps {
  readonly status: AppointmentStatus;
  readonly className?: string;
}

const STATUS_I18N_KEY: Record<AppointmentStatus, string> = {
  InProgress: 'scheduler.status.inprogress',
  Completed: 'scheduler.status.completed',
  Cancelled: 'scheduler.status.cancelled',
};

export const StatusBadge = memo(function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const { t } = useTranslation();
  const tone = APPOINTMENT_STATUS_TONE[status];

  return (
    <StatusPillBadge
      testId="appointment-status-badge"
      colorClassName={toneBadgeClasses[tone]}
      dotClassName={toneDotClasses[tone]}
      label={t(STATUS_I18N_KEY[status])}
      className={className}
    />
  );
});
