/**
 * Repair history list component.
 *
 * Renders a compact, read-only list of appointment history records
 * for a customer or vehicle.
 * @module pages/Customers/components/RepairHistoryList
 */
import { memo } from 'react';
import type { AppointmentDto } from '../../../types/scheduler/scheduler.types';
import {
	compactHeaderRowClass,
	compactItemTitleTextClass,
	mutedBodyTextClass,
	mutedSecondaryTextClass,
} from '../../../utils/formStyles';
import { formatDateTime } from '../helpers';
import { StatusBadge } from '../../Scheduler/components/shared/StatusBadge';

/** Props for the {@link RepairHistoryList} component. */
interface RepairHistoryListProps {
	readonly appointments: AppointmentDto[];
	readonly locale: string;
	readonly emptyMessage: string;
	readonly emptyMessageClassName?: string;
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
		<div className="min-w-0 divide-y divide-arsm-border/80 dark:divide-arsm-border-dark/80">
			{appointments.map((appointment) => (
				<button
					key={appointment.id}
					type="button"
					className={`flex min-h-[5.75rem] w-full min-w-0 flex-col justify-between px-3 py-3 text-left transition-colors duration-200 ${onOpenAppointment ? 'cursor-pointer hover:bg-arsm-hover/70 dark:hover:bg-arsm-hover-dark/70' : 'cursor-default'}`}
					onClick={() => onOpenAppointment?.(appointment)}
					disabled={!onOpenAppointment}
				>
					<div className={compactHeaderRowClass}>
						<p className={compactItemTitleTextClass}>
							{formatDateTime(appointment.scheduledDate, locale)}
						</p>
						<StatusBadge status={appointment.status} className="shrink-0" />
					</div>

					<p className={`mt-1.5 min-h-[2.25rem] overflow-hidden leading-5 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] ${mutedBodyTextClass}`}>
						{appointment.taskDescription}
					</p>
				</button>
			))}
		</div>
	);
});