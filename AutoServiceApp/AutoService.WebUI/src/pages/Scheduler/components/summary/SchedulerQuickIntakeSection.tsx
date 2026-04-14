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
    <section className="rounded-2xl border border-[#D8D2E9] bg-[#F6F4FB] p-4 shadow-sm dark:border-[#3A3154] dark:bg-[#13131B]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-[#2C2440] dark:text-[#EDE8FA]">{t('scheduler.intake.quickTitle')}</h3>
          <p className="text-sm text-[#6A627F] dark:text-[#B9B0D3]">
            {selectedDateLabel
              ? t('scheduler.intake.quickSelectedDay', { date: selectedDateLabel })
              : t('scheduler.intake.quickSelectDayHint')}
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenIntake}
          disabled={selectedDate === null}
          className="inline-flex items-center justify-center rounded-xl bg-[#C9B3FF] px-4 py-2 text-sm font-semibold text-[#2C2440] transition-colors hover:bg-[#BFA6F7] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#7A66C7] dark:text-[#F5F2FF] dark:hover:bg-[#8A75D6]"
        >
          {t('scheduler.intake.open')}
        </button>
      </div>
    </section>
  );
});
