/**
 * Repair history list component.
 *
 * Renders a compact, read-only list of appointment history records
 * for a customer or vehicle.
 * @module pages/Customers/components/RepairHistoryList
 */

import { memo } from 'react';
import type { AppointmentDto } from '../../../types/scheduler/scheduler.types';
import { formatDateTime, getStatusBadgeClass } from '../helpers';

/** Props for the {@link RepairHistoryList} component. */
interface RepairHistoryListProps {
  readonly appointments: AppointmentDto[];
  readonly locale: string;
  readonly emptyMessage: string;
}

/**
 * Renders a compact repair-history list.
 * Displays each appointment with scheduled date, task description, and status badge.
 * Shows an empty state message when no appointments are present.
 */
export const RepairHistoryList = memo(function RepairHistoryList({
  appointments,
  locale,
  emptyMessage,
}: RepairHistoryListProps) {
  if (appointments.length === 0) {
    return (
      <p className="text-center text-sm text-arsm-muted dark:text-arsm-muted-dark">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {appointments.map((appointment) => (
        <article
          key={appointment.id}
          className="rounded-xl border border-arsm-border bg-arsm-card px-4 py-3 shadow-sm transition-shadow duration-200 hover:shadow-md dark:border-arsm-border-dark dark:bg-arsm-card-dark dark:shadow-[0_8px_18px_rgba(3,5,14,0.45)] dark:hover:shadow-[0_12px_24px_rgba(3,5,14,0.58)]"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-arsm-primary dark:text-arsm-primary-dark">
              {formatDateTime(appointment.scheduledDateTime, locale)}
            </p>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusBadgeClass(appointment.status)}`}>
              {appointment.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-arsm-label dark:text-arsm-label-dark">
            {appointment.taskDescription}
          </p>
        </article>
      ))}
    </div>
  );
});
