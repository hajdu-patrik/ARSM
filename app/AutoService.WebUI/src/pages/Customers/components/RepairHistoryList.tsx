/** Repair history list: compact, read-only appointment history for a customer or vehicle. */
import { memo } from 'react';
import type { AppointmentDto } from '../../../types/scheduler/scheduler.types';
import {
  compactHeaderRowClass,
  compactItemTitleClampTextClass,
  insetFocusVisibleOutlineClass,
  mutedBodyTextClass,
  mutedSecondaryTextClass,
} from '../../../utils/formStyles';
import { formatShortDateTime } from '../../../utils/intlFormat';
import { StatusBadge } from '../../Scheduler/components/shared/StatusBadge';

interface RepairHistoryListProps {
  readonly appointments: AppointmentDto[];
  readonly locale: string;
  readonly emptyMessage: string;
  readonly emptyMessageClassName?: string | undefined;
  readonly onOpenAppointment: (appointment: AppointmentDto) => void;
}

/** Renders each appointment with scheduled date, task, and status badge, or an empty-state message. */
export const RepairHistoryList = memo(function RepairHistoryList({
  appointments,
  locale,
  emptyMessage,
  emptyMessageClassName,
  onOpenAppointment,
}: RepairHistoryListProps) {
  if (appointments.length === 0) {
    const emptyStateClassName = emptyMessageClassName
      ? `${emptyMessageClassName} ${mutedSecondaryTextClass}`
      : `text-center ${mutedSecondaryTextClass}`;

    return <p className={emptyStateClassName}>{emptyMessage}</p>;
  }

  return (
    <div className="min-w-0 divide-y divide-ui-border/80">
      {appointments.map((appointment) => (
        <button
          key={appointment.id}
          type="button"
          className={`flex min-h-[5.75rem] w-full min-w-0 cursor-pointer flex-col justify-between px-3 py-3 text-left transition-colors duration-200 hover:bg-ui-hover/70 ${insetFocusVisibleOutlineClass}`}
          onClick={() => {
            onOpenAppointment(appointment);
          }}
        >
          <span className={compactHeaderRowClass}>
            <span className={compactItemTitleClampTextClass}>
              {formatShortDateTime(appointment.scheduledDate, locale)}
            </span>
            <StatusBadge status={appointment.status} className="shrink-0" />
          </span>

          <span className={`block mt-1.5 min-h-[2.25rem] [overflow-wrap:anywhere] leading-5 ${mutedBodyTextClass}`}>
            {appointment.taskDescription}
          </span>
        </button>
      ))}
    </div>
  );
});