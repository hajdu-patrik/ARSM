/** Period selector: a year stepper plus whole-year and month tiles; whole year is the default since that is what the report is for. */
import { memo, useId } from 'react';
import type { TFunction } from 'i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  cardClass,
  defaultIconClass,
  getSegmentedTileClass,
  labelClass,
  navIconButtonClass,
  segmentedTrackClass,
} from '../../../utils/formStyles';
import { formatMonthName, formatMonthShort } from '../../../utils/intlFormat';

interface PeriodPickerProps {
  readonly t: TFunction;
  readonly locale: string;
  readonly year: number;
  readonly month: number | null;
  readonly onYearChange: (year: number) => void;
  readonly onMonthChange: (month: number | null) => void;
}

/** How many years back the picker offers, counted from the current UTC year. */
const SELECTABLE_YEARS = 6;

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/** Builds month labels in the current language, so the tiles read naturally without a translated key per name. */
function buildMonthLabels(locale: string): Array<{ month: number; shortName: string; fullName: string }> {
  return MONTHS.map((month) => {
    const date = new Date(2000, month - 1, 15);

    return { month, shortName: formatMonthShort(date, locale), fullName: formatMonthName(date, locale) };
  });
}

export const PeriodPicker = memo(function PeriodPicker({
  t,
  locale,
  year,
  month,
  onYearChange,
  onMonthChange,
}: PeriodPickerProps) {
  const yearLabelId = useId();
  const monthLabelId = useId();
  const currentYear = new Date().getUTCFullYear();
  const oldestYear = currentYear - (SELECTABLE_YEARS - 1);
  const monthLabels = buildMonthLabels(locale);

  return (
    <section className={cardClass}>
      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-8">
        <div className="min-w-0">
          <span id={yearLabelId} className={labelClass}>{t('companyResults.year')}</span>
          <div
            role="group"
            aria-labelledby={yearLabelId}
            data-testid="company-results-year"
            className="flex min-w-0 items-center gap-2"
          >
            <button
              type="button"
              data-testid="company-results-year-prev"
              title={t('companyResults.previousYear')}
              aria-label={t('companyResults.previousYear')}
              disabled={year <= oldestYear}
              onClick={() => {
                onYearChange(year - 1);
              }}
              className={navIconButtonClass}
            >
              <ChevronLeft className={defaultIconClass} aria-hidden="true" />
            </button>
            <output
              data-testid="company-results-year-value"
              aria-live="polite"
              className="min-w-16 text-center text-lg font-semibold tabular-nums text-ui-text"
            >
              {year}
            </output>
            <button
              type="button"
              data-testid="company-results-year-next"
              title={t('companyResults.nextYear')}
              aria-label={t('companyResults.nextYear')}
              disabled={year >= currentYear}
              onClick={() => {
                onYearChange(year + 1);
              }}
              className={navIconButtonClass}
            >
              <ChevronRight className={defaultIconClass} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="min-w-0">
          <span id={monthLabelId} className={labelClass}>{t('companyResults.month')}</span>
          <div
            role="group"
            aria-labelledby={monthLabelId}
            data-testid="company-results-month"
            className={`grid min-w-0 gap-1.5 ${segmentedTrackClass}`}
          >
            <button
              type="button"
              data-testid="company-results-month-all"
              aria-pressed={month === null}
              onClick={() => {
                onMonthChange(null);
              }}
              className={getSegmentedTileClass(month === null)}
            >
              {t('companyResults.wholeYear')}
            </button>
            <div className="grid min-w-0 grid-cols-4 gap-1.5 sm:grid-cols-6">
              {monthLabels.map(({ month: tileMonth, shortName, fullName }) => (
                <button
                  key={tileMonth}
                  type="button"
                  data-testid={`company-results-month-${String(tileMonth)}`}
                  title={fullName}
                  aria-label={fullName}
                  aria-pressed={month === tileMonth}
                  onClick={() => {
                    onMonthChange(tileMonth);
                  }}
                  className={getSegmentedTileClass(month === tileMonth)}
                >
                  {shortName}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});
