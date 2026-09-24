/**
 * Monthly breakdown of the accepted revenue. Every month of the period is
 * listed, empty ones included, so the months visibly add up to the year.
 * @module pages/CompanyResults/components/CompanyResultMonthList
 */
import { memo } from 'react';
import type { TFunction } from 'i18next';
import { DataList, DataListRow, type DataListColumn } from '../../../components/common/DataList';
import { LabeledValueTile } from '../../../components/common/LabeledValueTile';
import type { CompanyResultMonthDto } from '../../../types/reporting/company-results.types';
import { formatHuf } from '../../../utils/currency';
import {
  compactItemTitleTextClass,
  compactSectionHeadingTextClass,
  compactTwoColumnGridClass,
  numericValueTextClass,
} from '../../../utils/formStyles';
import { formatQuantity } from '../../../utils/number';

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
    { key: 'quotes', label: t('companyResults.quotes'), align: 'right' },
    { key: 'net', label: t('companyResults.net'), align: 'right' },
    { key: 'gross', label: t('companyResults.gross'), align: 'right' },
  ];

  return (
    <section className="min-w-0 space-y-3">
      <h2 className={compactSectionHeadingTextClass}>{t('companyResults.monthsTitle')}</h2>

      <DataList breakpoint="lg" columnsClassName={monthColumnsClass} columns={columns} isEmpty={false} emptyText="">
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
                  <p className={numericValueTextClass}>{formatHuf(month.acceptedNet, locale)}</p>
                  <p className={`${numericValueTextClass} font-semibold`}>{formatHuf(month.acceptedGross, locale)}</p>
                </>
              )}
              mobile={(
                <>
                  <p className={compactItemTitleTextClass}>{monthName}</p>
                  <div className={compactTwoColumnGridClass}>
                    <LabeledValueTile
                      label={t('companyResults.quotes')}
                      value={formatQuantity(month.acceptedQuoteCount, locale)}
                      valueClassName="text-right tabular-nums"
                    />
                    <LabeledValueTile
                      label={t('companyResults.net')}
                      value={formatHuf(month.acceptedNet, locale)}
                      valueClassName="text-right tabular-nums"
                    />
                    <LabeledValueTile
                      label={t('companyResults.gross')}
                      value={formatHuf(month.acceptedGross, locale)}
                      valueClassName="text-right tabular-nums font-semibold"
                    />
                  </div>
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
