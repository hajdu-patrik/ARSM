/** Due-date state utilities: overdue/remaining duration plus matching tone class and i18n label. */

import { toneTextClasses } from '../../../utils/formStyles';

/** Computed due-state for an appointment's due datetime. */
export interface DueState {
  /** Whether the due datetime has already passed. */
  isOverdue: boolean;
  /** Tailwind color class reflecting the urgency tone. */
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

/** Computes due state from a due datetime: overdue/remaining duration, amber tone under one day left. */
export function getDueState(dueDateTime: string): DueState {
  const dueDate = new Date(dueDateTime);
  const dueTimestamp = dueDate.getTime();

  if (Number.isNaN(dueTimestamp)) {
    return {
      isOverdue: false,
      toneClassName: 'text-arsm-muted dark:text-arsm-muted-dark',
      labelKey: 'scheduler.due.unknown',
    };
  }

  const nowTimestamp = Date.now();
  const diffMs = dueTimestamp - nowTimestamp;

  if (diffMs < 0) {
    const overdueDuration = splitDuration(Math.abs(diffMs));
    return {
      isOverdue: true,
      toneClassName: toneTextClasses.error,
      labelKey: 'scheduler.due.overdueByDays',
      labelValues: overdueDuration,
    };
  }

  const dueDuration = splitDuration(diffMs);

  return {
    isOverdue: false,
    toneClassName: diffMs < MS_PER_DAY
      ? toneTextClasses.warning
      : toneTextClasses.neutral,
    labelKey: 'scheduler.due.daysLeft',
    labelValues: dueDuration,
  };
}

/** Converts a datetime string to the YYYY-MM-DDThh:mm format for `<input type="datetime-local">`. */
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

/** Builds a UTC timestamp string for a specific calendar day and time. */
export function buildSelectedDayIso(year: number, month: number, day: number, hour: number, minute = 0): string {
  const date = new Date(year, month - 1, day, hour, minute, 0, 0);
  return date.toISOString();
}
