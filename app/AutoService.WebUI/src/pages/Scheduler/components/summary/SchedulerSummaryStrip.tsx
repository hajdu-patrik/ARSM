/**
 * Summary strip component displayed at the top of the scheduler page.
 * Shows the context date label and a count of scheduled appointments
 * for the selected day (or today when no day is selected).
 * @module SchedulerSummaryStrip
 */
import { memo } from 'react';
import type { TFunction } from 'i18next';

/** Props for the {@link SchedulerSummaryStrip} component. */
interface SchedulerSummaryStripProps {
  /** Localized date text describing the summary context (today or selected day). */
  readonly summaryDateText: string;
  /** Number of appointments scheduled for the summary date. */
  readonly summaryCount: number;
  /** i18next translation function. */
  readonly t: TFunction;
}

/** Memoized summary strip showing date context and appointment count. */
export const SchedulerSummaryStrip = memo(function SchedulerSummaryStrip({
  summaryDateText,
  summaryCount,
  t,
}: SchedulerSummaryStripProps) {
  return (
    <section className="rounded-2xl border border-[#D8D2E9] bg-[#F6F4FB] px-4 py-3 shadow-sm dark:border-[#3A3154] dark:bg-[#13131B]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-[#2C2440] dark:text-[#EDE8FA]">
          {summaryDateText}
        </p>
        <span className="inline-flex items-center rounded-full bg-[#EFEBFA] px-3 py-1 text-xs font-medium text-[#2C2440] dark:bg-[#241F33] dark:text-[#F5F2FF]">
          {t('scheduler.scheduledCount', { count: summaryCount })}
        </span>
      </div>
    </section>
  );
});
