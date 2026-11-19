/** Scheduler date helpers: display formats are the shared 24-hour presets of utils/intlFormat, so the
 * scheduler follows the app-wide locale rules (en-GB for English, `-` for an unparsable value). */
import type { AppointmentDto } from '../../../types/scheduler/scheduler.types';
import { formatShortDateTime } from '../../../utils/intlFormat';

export { formatLongDate, formatLongDateTime } from '../../../utils/intlFormat';

/** Exact due date and time without weekday, as the short 24-hour date-time preset. */
export function formatDueExactDateTime(isoValue: string, language: string): string {
  return formatShortDateTime(isoValue, language);
}

function toStartOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** Local midnight of the day holding the given timestamp, as a timestamp. */
export function startOfDayTimestamp(timestamp: number): number {
  return toStartOfDay(new Date(timestamp)).getTime();
}

/** Checks whether an appointment is scheduled on the given calendar day, in local time. */
export function isScheduledOn(appointment: AppointmentDto, day: Date): boolean {
  const scheduledDate = new Date(appointment.scheduledDate);

  return scheduledDate.getFullYear() === day.getFullYear()
    && scheduledDate.getMonth() === day.getMonth()
    && scheduledDate.getDate() === day.getDate();
}
