/** Monthly breakdown of accepted revenue; every month is listed, even empty ones, so it sums to the year. */
import { memo } from 'react';
import type { TFunction } from 'i18next';
import { DataList, DataListRow, type DataListColumn } from '../../../components/common/DataList';
import type { CompanyResultMonthDto } from '../../../types/reporting/company-results.types';
import { formatHuf } from '../../../utils/currency';
import {
  compactItemTitleClampTextClass,
  compactItemTitleTextClass,
  compactSectionHeadingTextClass,
  numericValueTextClass,
  numericValueWrapTextClass,
} from '../../../utils/formStyles';
import { formatQuantity } from '../../../utils/number';
import { MobileColumnStrip } from './MobileColumnStrip';
import { MobileStackedValues } from './MobileStackedValues';
import { mobileColumnsClass } from './mobileColumns';

interface CompanyResultMonthListProps {
  readonly t: TFunction;
  readonly locale: string;
  readonly months: CompanyResultMonthDto[];
}

/** Column grid shared by the header row and every month row via CSS subgrid. */
const monthColumnsClass = '@lg:grid-cols-[minmax(6rem,1.4fr)_minmax(3.5rem,auto)_minmax(6.5rem,auto)_minmax(6.5rem,auto)]';

const CompanyResultMonthListComponent = memo(function CompanyResultMonthList({
  t,
  locale,
  months,
}: CompanyResultMonthListProps) {
  const monthFormatter = new Intl.DateTimeFormat(locale, { month: 'long' });

  const columns: DataListColumn[] = [
    { key: 'month', label: t('companyResults.month') },
    { key: 'quotes', label: t('nav.quotes'), align: 'right' },
    { key: 'net', label: t('common.fields.net'), align: 'right' },
    { key: 'gross', label: t('common.fields.gross'), align: 'right' },
  ];

  return (
    <section className="min-w-0 space-y-3">
      <h2 className={compactSectionHeadingTextClass}>{t('companyResults.monthsTitle')}</h2>

      <DataList breakpoint="lg" columnsClassName={monthColumnsClass} columns={columns} isEmpty={false} emptyText="">
        <MobileColumnStrip columns={columns.slice(1)} />
        {months.map((month) => {
          const monthName = monthFormatter.format(new Date(Date.UTC(2000, month.month - 1, 1)));

          return (
            <DataListRow
              key={month.month}
              breakpoint="lg"
              testId="company-results-month-row"
              desktop={(
                <>
                  <p className={compactItemTitleTextClass}>{monthName}</p>
                  <p className={numericValueTextClass}>{formatQuantity(month.acceptedQuoteCount, locale)}</p>
                  <p className={numericValueWrapTextClass}>{formatHuf(month.acceptedNet, locale)}</p>
                  <p className={`${numericValueWrapTextClass} font-semibold`}>{formatHuf(month.acceptedGross, locale)}</p>
                </>
              )}
              mobile={(
                <>
                  <p className={compactItemTitleClampTextClass}>{monthName}</p>
                  <div className={mobileColumnsClass}>
                    <p className={numericValueWrapTextClass}>{formatQuantity(month.acceptedQuoteCount, locale)}</p>
                    <p className={numericValueWrapTextClass}>{formatHuf(month.acceptedNet, locale)}</p>
                    <p className={`${numericValueWrapTextClass} font-semibold`}>{formatHuf(month.acceptedGross, locale)}</p>
                  </div>
                  <MobileStackedValues
                    values={[
                      { label: columns[1].label, value: formatQuantity(month.acceptedQuoteCount, locale) },
                      { label: columns[2].label, value: formatHuf(month.acceptedNet, locale) },
                      { label: columns[3].label, value: formatHuf(month.acceptedGross, locale), emphasized: true },
                    ]}
                  />
                </>
              )}
            />
          );
        })}
      </DataList>
    </section>
  );
});

CompanyResultMonthListComponent.displayName = 'CompanyResultMonthList';

export const CompanyResultMonthList = CompanyResultMonthListComponent;
