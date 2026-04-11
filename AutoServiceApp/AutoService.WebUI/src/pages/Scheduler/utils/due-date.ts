export interface DueState {
  isOverdue: boolean;
  toneClassName: string;
  labelKey: string;
  labelValues?: Record<string, number>;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

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
    const overdueDays = Math.max(1, Math.ceil(Math.abs(diffMs) / MS_PER_DAY));
    return {
      isOverdue: true,
      toneClassName: 'text-red-700 dark:text-red-300',
      labelKey: 'scheduler.due.overdueByDays',
      labelValues: { count: overdueDays },
    };
  }

  const daysLeft = Math.floor(diffMs / MS_PER_DAY);
  if (daysLeft === 0) {
    return {
      isOverdue: false,
      toneClassName: 'text-amber-700 dark:text-amber-300',
      labelKey: 'scheduler.due.today',
    };
  }

  return {
    isOverdue: false,
    toneClassName: 'text-[#5E5672] dark:text-[#CFC5EA]',
    labelKey: 'scheduler.due.daysLeft',
    labelValues: { count: daysLeft },
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
