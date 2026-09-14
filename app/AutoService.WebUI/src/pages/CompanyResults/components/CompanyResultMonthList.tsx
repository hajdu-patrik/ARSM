/**
 * Monthly breakdown of the accepted revenue. Every month of the period is
 * listed, empty ones included, so the months visibly add up to the year.
 * @module pages/CompanyResults/components/CompanyResultMonthList
 */
import { memo } from 'react';
import type { TFunction } from 'i18next';
import type { CompanyResultMonthDto } from '../../../types/reporting/company-results.types';
import { formatHuf } from '../../../utils/currency';
import {
  compactDataSurfaceClass,
  compactSectionHeadingTextClass,
  contentCardFrameClass,
  mutedMetaTextClass,
} from '../../../utils/formStyles';

interface CompanyResultMonthListProps {
  readonly t: TFunction;
  readonly locale: string;
  readonly months: CompanyResultMonthDto[];
}

/** Column grid shared by the header row and the month rows. */
const monthRowGridClass = 'sm:grid sm:grid-cols-[minmax(0,1.4fr)_minmax(4rem,auto)_minmax(7rem,auto)_minmax(7rem,auto)] sm:items-center sm:gap-3';

const monthValueClass = 'min-w-0 truncate text-right text-sm tabular-nums text-arsm-primary dark:text-arsm-primary-dark';
const monthLabelClass = 'min-w-0 truncate text-sm text-arsm-primary dark:text-arsm-primary-dark';

const CompanyResultMonthListComponent = memo(function CompanyResultMonthList({
  t,
  locale,
  months,
}: CompanyResultMonthListProps) {
  const monthFormatter = new Intl.DateTimeFormat(locale, { month: 'long' });

  return (
    <section className="min-w-0 space-y-3">
      <h2 className={compactSectionHeadingTextClass}>{t('companyResults.monthsTitle')}</h2>

      <div className={`min-w-0 ${contentCardFrameClass}`}>
        <div className={`hidden ${monthRowGridClass} border-b border-arsm-border px-3 py-2 text-xs font-medium uppercase tracking-wide text-arsm-muted dark:border-arsm-border-dark dark:text-arsm-muted-dark sm:px-3.5`}>
          <span>{t('companyResults.month')}</span>
          <span className="text-right">{t('companyResults.quotes')}</span>
          <span className="text-right">{t('companyResults.net')}</span>
          <span className="text-right">{t('companyResults.gross')}</span>
        </div>

        <div className="min-w-0 divide-y divide-arsm-border/80 dark:divide-arsm-border-dark/80">
          {months.map((month) => {
            const monthName = monthFormatter.format(new Date(Date.UTC(2000, month.month - 1, 1)));

            return (
              <div key={month.month} data-testid="company-results-month-row" className="min-w-0 px-3 py-3 sm:px-3.5">
                <div className={`hidden min-w-0 ${monthRowGridClass}`}>
                  <p className={monthLabelClass}>{monthName}</p>
                  <p className={monthValueClass}>{month.acceptedQuoteCount}</p>
                  <p className={monthValueClass}>{formatHuf(month.acceptedNet, locale)}</p>
                  <p className={`${monthValueClass} font-semibold`}>{formatHuf(month.acceptedGross, locale)}</p>
                </div>

                <div className="min-w-0 space-y-2 sm:hidden">
                  <p className={monthLabelClass}>{monthName}</p>
                  <div className="grid min-w-0 grid-cols-1 gap-2">
                    <div className={compactDataSurfaceClass}>
                      <p className={mutedMetaTextClass}>{t('companyResults.quotes')}</p>
                      <p className={monthValueClass}>{month.acceptedQuoteCount}</p>
                    </div>
                    <div className={compactDataSurfaceClass}>
                      <p className={mutedMetaTextClass}>{t('companyResults.net')}</p>
                      <p className={monthValueClass}>{formatHuf(month.acceptedNet, locale)}</p>
                    </div>
                    <div className={compactDataSurfaceClass}>
                      <p className={mutedMetaTextClass}>{t('companyResults.gross')}</p>
                      <p className={`${monthValueClass} font-semibold`}>{formatHuf(month.acceptedGross, locale)}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
});

CompanyResultMonthListComponent.displayName = 'CompanyResultMonthList';

export const CompanyResultMonthList = CompanyResultMonthListComponent;
