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
    <section className="rounded-2xl border border-arsm-border bg-arsm-input px-4 py-3 shadow-sm dark:border-arsm-border-dark dark:bg-arsm-card-dark">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-arsm-primary dark:text-arsm-primary-dark">
          {summaryDateText}
        </p>
        <span className="inline-flex items-center rounded-full bg-arsm-toggle-bg px-3 py-1 text-xs font-medium text-arsm-primary dark:bg-arsm-toggle-bg-dark dark:text-arsm-hover">
          {t('scheduler.scheduledCount', { count: summaryCount })}
        </span>
      </div>
    </section>
  );
});
