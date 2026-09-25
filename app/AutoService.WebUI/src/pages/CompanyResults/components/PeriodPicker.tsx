/**
 * Period selector: a year, and optionally one month of it. Picking "whole
 * year" is the default, because the yearly figure is what the report is for;
 * the monthly view narrows it.
 * @module pages/CompanyResults/components/PeriodPicker
 */
import { memo } from 'react';
import type { TFunction } from 'i18next';
import {
  cardClass,
  compactSelectFullClass,
  formFieldGridClass,
  labelClass,
  selectWrapperClass,
} from '../../../utils/formStyles';

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

/**
 * Builds the month labels in the current locale, so the list reads naturally
 * in both languages without a translated month key per name.
 * @param locale Current i18n locale.
 * @returns Month names indexed from January.
 */
function buildMonthNames(locale: string): string[] {
  const formatter = new Intl.DateTimeFormat(locale, { month: 'long' });
  return MONTHS.map((month) => formatter.format(new Date(Date.UTC(2000, month - 1, 1))));
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

  return (
    <section className={cardClass}>
      <div className={formFieldGridClass}>
        <div className="min-w-0">
          <label htmlFor="company-results-year" className={labelClass}>{t('companyResults.year')}</label>
          <div className={selectWrapperClass}>
            <select
              data-testid="company-results-year"
              id="company-results-year"
              value={year}
              onChange={(event) => onYearChange(Number(event.target.value))}
              className={compactSelectFullClass}
            >
              {years.map((selectableYear) => (
                <option key={selectableYear} value={selectableYear}>{selectableYear}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="min-w-0">
          <label htmlFor="company-results-month" className={labelClass}>{t('companyResults.month')}</label>
          <div className={selectWrapperClass}>
            <select
              data-testid="company-results-month"
              id="company-results-month"
              value={month ?? ''}
              onChange={(event) => onMonthChange(event.target.value === '' ? null : Number(event.target.value))}
              className={compactSelectFullClass}
            >
              <option value="">{t('companyResults.wholeYear')}</option>
              {MONTHS.map((selectableMonth) => (
                <option key={selectableMonth} value={selectableMonth}>{monthNames[selectableMonth - 1]}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </section>
  );
});

PeriodPickerComponent.displayName = 'PeriodPicker';

export const PeriodPicker = PeriodPickerComponent;
