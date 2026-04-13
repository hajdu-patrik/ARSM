export interface DueState {
  isOverdue: boolean;
  toneClassName: string;
  labelKey: string;
  labelValues?: Record<string, number>;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_MINUTE = 60 * 1000;

function splitDuration(absDiffMs: number): { days: number; hours: number; minutes: number } {
  const totalMinutes = Math.max(0, Math.ceil(absDiffMs / MS_PER_MINUTE));
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  return { days, hours, minutes };
}

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

export function buildSelectedDayIso(year: number, month: number, day: number, hour: number, minute = 0): string {
  const date = new Date(year, month - 1, day, hour, minute, 0, 0);
  return date.toISOString();
}
