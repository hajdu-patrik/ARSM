/** Period selector: year plus optional month; whole year is the default since that is what the report is for. */
import { memo } from 'react';
import type { TFunction } from 'i18next';
import { Dropdown } from '../../../components/common/Dropdown';
import {
  cardClass,
  formFieldGridClass,
  labelClass,
  selectWrapperClass,
} from '../../../utils/formStyles';
import { formatMonthName } from '../../../utils/intlFormat';

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

/** Builds month labels in the current language, so the list reads naturally without a translated key per name. */
function buildMonthNames(locale: string): string[] {
  return MONTHS.map((month) => formatMonthName(new Date(2000, month - 1, 15), locale));
}

const PeriodPickerComponent = memo(function PeriodPicker({
  t,
  locale,
  year,
  month,
  onYearChange,
  onMonthChange,
}: PeriodPickerProps) {
  const currentYear = new Date().getUTCFullYear();
  const years = Array.from({ length: SELECTABLE_YEARS }, (_, index) => currentYear - index);
  const monthNames = buildMonthNames(locale);
  const yearOptions = years.map((selectableYear) => ({ value: String(selectableYear), label: String(selectableYear) }));
  const monthOptions = [
    { value: '', label: t('companyResults.wholeYear') },
    ...MONTHS.map((selectableMonth) => ({ value: String(selectableMonth), label: monthNames[selectableMonth - 1] ?? '' })),
  ];

  return (
    <section className={cardClass}>
      <div className={formFieldGridClass}>
        <div className="min-w-0">
          <label htmlFor="company-results-year" className={labelClass}>{t('companyResults.year')}</label>
          <div className={selectWrapperClass}>
            <Dropdown
              data-testid="company-results-year"
              id="company-results-year"
              value={String(year)}
              options={yearOptions}
              onChange={(value) => {
                onYearChange(Number(value));
              }}
            />
          </div>
        </div>

        <div className="min-w-0">
          <label htmlFor="company-results-month" className={labelClass}>{t('companyResults.month')}</label>
          <div className={selectWrapperClass}>
            <Dropdown
              data-testid="company-results-month"
              id="company-results-month"
              value={month === null ? '' : String(month)}
              options={monthOptions}
              onChange={(value) => {
                onMonthChange(value === '' ? null : Number(value));
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
});

PeriodPickerComponent.displayName = 'PeriodPicker';

export const PeriodPicker = PeriodPickerComponent;
