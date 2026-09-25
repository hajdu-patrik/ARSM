/**
 * Colored status pill badge for appointment status display.
 * Colors each {@link AppointmentStatus} through its semantic tone
 * and renders the localized status label.
 * @module StatusBadge
 */
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { StatusPillBadge } from '../../../../components/common/StatusPillBadge';
import type { AppointmentStatus } from '../../../../types/scheduler/scheduler.types';
import { toneBadgeClasses, toneDotClasses } from '../../../../utils/formStyles';
import { APPOINTMENT_STATUS_TONE } from '../../utils/appointmentStatusTone';

/** Props for the {@link StatusBadge} component. */
interface StatusBadgeProps {
  /** The appointment status to display. */
  readonly status: AppointmentStatus;
  /** Additional CSS classes appended to the badge element. */
  readonly className?: string;
}

/** i18n translation key for each appointment status label. */
const STATUS_I18N_KEY: Record<AppointmentStatus, string> = {
  InProgress: 'scheduler.status.inprogress',
  Completed: 'scheduler.status.completed',
  Cancelled: 'scheduler.status.cancelled',
};

const StatusBadgeComponent = memo(function StatusBadge({ status, className = '' }: StatusBadgeProps) {
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

StatusBadgeComponent.displayName = 'StatusBadge';

/** Memoized colored status pill badge. */
export const StatusBadge = StatusBadgeComponent;
