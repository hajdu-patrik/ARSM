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
    <section className="relative overflow-hidden rounded-2xl border border-arsm-border bg-arsm-input px-4 py-3.5 shadow-[0_12px_28px_rgba(28,22,46,0.09),0_0_0_1px_rgba(255,255,255,0.5)_inset] dark:border-arsm-border-dark dark:bg-arsm-card-dark dark:shadow-[0_16px_34px_rgba(3,5,14,0.56),0_0_0_1px_rgba(255,255,255,0.04)_inset]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-arsm-primary dark:text-arsm-primary-dark">
          {summaryDateText}
        </p>
        <span className="inline-flex items-center rounded-full border border-arsm-border bg-arsm-toggle-bg px-3 py-1 text-xs font-semibold text-arsm-primary dark:border-arsm-border-dark dark:bg-arsm-toggle-bg-dark dark:text-arsm-hover">
          {t('scheduler.scheduledCount', { count: summaryCount })}
        </span>
      </div>
    </section>
  );
});
