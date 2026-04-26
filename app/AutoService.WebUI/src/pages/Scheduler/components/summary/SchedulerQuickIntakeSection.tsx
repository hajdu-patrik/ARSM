/**
 * Quick intake action section for the scheduler page.
 * Displays the selected day label and a button to open the intake modal.
 * The button is disabled when no day is selected.
 * @module SchedulerQuickIntakeSection
 */
import { memo } from 'react';
import type { TFunction } from 'i18next';

/** Props for the {@link SchedulerQuickIntakeSection} component. */
interface SchedulerQuickIntakeSectionProps {
  /** Localized label of the selected day, or null when no day is selected. */
  readonly selectedDateLabel: string | null;
  /** The selected Date object, or null when no day is selected. */
  readonly selectedDate: Date | null;
  /** i18next translation function. */
  readonly t: TFunction;
  /** Callback to open the intake modal for the selected day. */
  readonly onOpenIntake: () => void;
}

/** Memoized quick intake section with selected day context and action button. */
export const SchedulerQuickIntakeSection = memo(function SchedulerQuickIntakeSection({
  selectedDateLabel,
  selectedDate,
  t,
  onOpenIntake,
}: SchedulerQuickIntakeSectionProps) {
  return (
    <section className="rounded-2xl border border-arsm-border bg-arsm-input p-4 shadow-sm dark:border-arsm-border-dark dark:bg-arsm-card-dark">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-arsm-primary dark:text-arsm-primary-dark">{t('scheduler.intake.quickTitle')}</h3>
          <p className="text-sm text-arsm-muted dark:text-arsm-muted-dark">
            {selectedDateLabel
              ? t('scheduler.intake.quickSelectedDay', { date: selectedDateLabel })
              : t('scheduler.intake.quickSelectDayHint')}
          </p>
        </div>

        <button
          type="button"
          data-testid="scheduler-intake-open"
          onClick={onOpenIntake}
          disabled={selectedDate === null}
          className="inline-flex items-center justify-center rounded-xl bg-arsm-accent px-4 py-2 text-sm font-semibold text-arsm-primary transition-colors hover:bg-arsm-accent-hover disabled:cursor-not-allowed disabled:opacity-50 dark:bg-arsm-accent-dark dark:text-arsm-hover dark:hover:bg-arsm-accent-dark-hover"
        >
          {t('scheduler.intake.open')}
        </button>
      </div>
    </section>
  );
});
