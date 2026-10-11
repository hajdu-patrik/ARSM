/** Scheduler date helpers: display formats are the shared 24-hour presets of utils/intlFormat, so the
 * scheduler follows the app-wide locale rules (en-GB for English, `-` for an unparsable value). */
import { formatShortDateTime } from '../../../utils/intlFormat';

export { formatLongDate, formatLongDateTime } from '../../../utils/intlFormat';

/** Exact due date and time without weekday, as the short 24-hour date-time preset. */
export function formatDueExactDateTime(isoValue: string, language: string): string {
  return formatShortDateTime(isoValue, language);
}

/** Returns a new Date set to midnight (00:00:00.000) of the given date. */
export function toStartOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** Returns `true` when the given date falls before today (ignoring time). */
export function isPastCalendarDay(date: Date): boolean {
  return toStartOfDay(date).getTime() < toStartOfDay(new Date()).getTime();
}
