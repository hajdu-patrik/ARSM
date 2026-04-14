/**
 * Shared scheduler date/time formatting and day-comparison helpers.
 *
 * All formatters use `Intl.DateTimeFormat` for locale-aware output
 * used across calendar views, appointment cards, and summary strips.
 *
 * @module scheduler-datetime
 */

/**
 * Formats an ISO datetime to a localized 24-hour time string (e.g. "14:30").
 */
export function formatScheduledTime(isoValue: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(isoValue));
}

/** Formats a Date to a long localized date string (e.g. "Monday, April 14, 2026"). */
export function formatLongDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

/** Formats an ISO datetime to a long localized date-time string including weekday. */
export function formatLongDateTime(isoValue: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoValue));
}

/** Formats an ISO datetime to a localized date-time string without weekday (used for due dates). */
export function formatDueExactDateTime(isoValue: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoValue));
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
