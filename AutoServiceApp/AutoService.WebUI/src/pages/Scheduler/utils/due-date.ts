/**
 * Due-date state utilities for scheduler appointment cards and detail modal.
 *
 * Computes whether an appointment is overdue, due today, or has days
 * remaining, and provides the matching Tailwind tone class and i18n label.
 *
 * @module due-date
 */

/** Computed due-state for an appointment's due datetime. */
export interface DueState {
  /** Whether the due datetime has already passed. */
  isOverdue: boolean;
  /** Tailwind color class reflecting the urgency tone (red/amber/neutral). */
  toneClassName: string;
  /** i18n translation key describing the due state. */
  labelKey: string;
  /** Interpolation values (days, hours, minutes) for the label key. */
  labelValues?: Record<string, number>;
}

/** Milliseconds in one calendar day. */
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Milliseconds in one minute. */
const MS_PER_MINUTE = 60 * 1000;

function splitDuration(absDiffMs: number): { days: number; hours: number; minutes: number } {
  const totalMinutes = Math.max(0, Math.ceil(absDiffMs / MS_PER_MINUTE));
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  return { days, hours, minutes };
}

/**
 * Computes the due state for an appointment given its ISO due datetime.
 *
 * Returns overdue duration when past, remaining duration when future,
 * and an amber tone when less than one day remains.
 */
export function getDueState(dueDateTime: string): DueState {
  const dueDate = new Date(dueDateTime);
  const dueTimestamp = dueDate.getTime();

  if (Number.isNaN(dueTimestamp)) {
    return {
      isOverdue: false,
      toneClassName: 'text-[#6A627F] dark:text-[#B9B0D3]',
      labelKey: 'scheduler.due.unknown',
    };
  }

  const nowTimestamp = Date.now();
  const diffMs = dueTimestamp - nowTimestamp;

  if (diffMs < 0) {
    const overdueDuration = splitDuration(Math.abs(diffMs));
    return {
      isOverdue: true,
      toneClassName: 'text-red-700 dark:text-red-300',
      labelKey: 'scheduler.due.overdueByDays',
      labelValues: overdueDuration,
    };
  }

  const dueDuration = splitDuration(diffMs);

  return {
    isOverdue: false,
    toneClassName: diffMs < MS_PER_DAY
      ? 'text-amber-700 dark:text-amber-300'
      : 'text-[#5E5672] dark:text-[#CFC5EA]',
    labelKey: 'scheduler.due.daysLeft',
    labelValues: dueDuration,
  };
}

/**
 * Converts an ISO datetime string to the `YYYY-MM-DDThh:mm` format
 * expected by `<input type="datetime-local">`.
 */
export function toDatetimeLocalValue(isoValue: string): string {
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Builds an ISO 8601 string for a specific calendar day and time.
 *
 * @param year   - Full calendar year (e.g. 2026).
 * @param month  - 1-based month (1 = January).
 * @param day    - Day of the month.
 * @param hour   - Hour (0-23).
 * @param minute - Minute (defaults to 0).
 */
export function buildSelectedDayIso(year: number, month: number, day: number, hour: number, minute = 0): string {
  const date = new Date(year, month - 1, day, hour, minute, 0, 0);
  return date.toISOString();
}
