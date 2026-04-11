import { memo } from 'react';
import type { TFunction } from 'i18next';

interface SchedulerQuickIntakeSectionProps {
  readonly selectedDateLabel: string | null;
  readonly selectedDate: Date | null;
  readonly isSelectedDateInPast: boolean;
  readonly t: TFunction;
  readonly onOpenIntake: () => void;
}

export const SchedulerQuickIntakeSection = memo(function SchedulerQuickIntakeSection({
  selectedDateLabel,
  selectedDate,
  isSelectedDateInPast,
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
          disabled={selectedDate === null || isSelectedDateInPast}
          className="inline-flex items-center justify-center rounded-xl bg-[#C9B3FF] px-4 py-2 text-sm font-semibold text-[#2C2440] transition-colors hover:bg-[#BFA6F7] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#7A66C7] dark:text-[#F5F2FF] dark:hover:bg-[#8A75D6]"
        >
          {t('scheduler.intake.open')}
        </button>
      </div>
    </section>
  );
});
