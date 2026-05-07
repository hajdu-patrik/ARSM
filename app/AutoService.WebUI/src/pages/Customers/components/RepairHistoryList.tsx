/**
 * Repair history list component.
 *
 * Renders a compact, read-only list of appointment history records
 * for a customer or vehicle.
 * @module pages/Customers/components/RepairHistoryList
 */
import { memo } from 'react';
import type { AppointmentDto } from '../../../types/scheduler/scheduler.types';
import { formatDateTime } from '../helpers';
import { StatusBadge } from '../../Scheduler/components/shared/StatusBadge';

/** Props for the {@link RepairHistoryList} component. */
interface RepairHistoryListProps {
	readonly appointments: AppointmentDto[];
	readonly locale: string;
	readonly emptyMessage: string;
	readonly onOpenAppointment?: (appointment: AppointmentDto) => void;
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
	onOpenAppointment,
}: RepairHistoryListProps) {
	if (appointments.length === 0) {
		return <p className="text-center text-sm text-arsm-muted dark:text-arsm-muted-dark">{emptyMessage}</p>;
	}

	return (
		<div className="divide-y divide-arsm-border/50 dark:divide-arsm-border-dark/50">
			{appointments.map((appointment) => (
				<button
					key={appointment.id}
					type="button"
					className={`flex min-h-[5.75rem] w-full min-w-0 flex-col justify-between py-3 text-left transition-colors duration-200 ${onOpenAppointment ? 'cursor-pointer hover:bg-arsm-hover/70 dark:hover:bg-arsm-hover-dark/70' : 'cursor-default'}`}
					onClick={() => onOpenAppointment?.(appointment)}
					disabled={!onOpenAppointment}
				>
					<div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
						<p className="min-w-0 truncate text-sm font-semibold text-arsm-primary dark:text-arsm-primary-dark">
							{formatDateTime(appointment.scheduledDate, locale)}
						</p>
						<StatusBadge status={appointment.status} className="min-h-0 shrink-0 px-2 py-0.5 text-[10px]" />
					</div>

					<p className="mt-1.5 min-h-[2.25rem] overflow-hidden text-sm leading-5 text-arsm-label [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] dark:text-arsm-label-dark">
						{appointment.taskDescription}
					</p>
				</button>
			))}
		</div>
	);
});