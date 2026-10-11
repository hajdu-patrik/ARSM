/** Monthly breakdown of accepted revenue; every month is listed, even empty ones, so it sums to the year. */
import { memo } from 'react';
import type { TFunction } from 'i18next';
import { DataList, DataListCell, DataListRow, DataListText, type DataListColumn } from '../../../components/common/DataList';
import type { CompanyResultMonthDto } from '../../../types/reporting/company-results.types';
import { formatHuf } from '../../../utils/currency';
import { compactSectionHeadingTextClass } from '../../../utils/formStyles';
import { formatMonthName } from '../../../utils/intlFormat';
import { formatQuantity } from '../../../utils/number';
import { MobileColumnStrip } from './MobileColumnStrip';
import { MobileStackedValues } from './MobileStackedValues';
import { mobileValuesClass } from './mobileColumns';

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
  const monthColumn: DataListColumn = { key: 'month', label: t('companyResults.month') };
  const quotesColumn: DataListColumn = { key: 'quotes', label: t('nav.quotes'), align: 'right' };
  const netColumn: DataListColumn = { key: 'net', label: t('common.fields.net'), align: 'right' };
  const grossColumn: DataListColumn = { key: 'gross', label: t('common.fields.gross'), align: 'right' };
  const valueColumns = [quotesColumn, netColumn, grossColumn];

  return (
    <section className="min-w-0 space-y-3">
      <h2 className={compactSectionHeadingTextClass}>{t('companyResults.monthsTitle')}</h2>

      <DataList
        breakpoint="lg"
        columnsClassName={monthColumnsClass}
        columns={[monthColumn, ...valueColumns]}
        isEmpty={false}
        emptyText=""
      >
        <MobileColumnStrip columns={valueColumns} />
        {months.map((month) => {
          // A local date, so the month name never shifts with the time zone.
          const monthName = formatMonthName(new Date(2000, month.month - 1, 1), locale);

          return (
            <DataListRow
              key={month.month}
              testId="company-results-month-row"
              valuesClassName={mobileValuesClass}
              lead={(
                <DataListCell column={monthColumn.key}>
                  <DataListText kind="title" title={monthName}>{monthName}</DataListText>
                </DataListCell>
              )}
            >
              <MobileStackedValues
                values={[
                  { column: quotesColumn.key, label: quotesColumn.label, value: formatQuantity(month.acceptedQuoteCount, locale), ellipsis: true },
                  { column: netColumn.key, label: netColumn.label, value: formatHuf(month.acceptedNet, locale) },
                  { column: grossColumn.key, label: grossColumn.label, value: formatHuf(month.acceptedGross, locale), emphasized: true },
                ]}
              />
            </DataListRow>
          );
        })}
      </DataList>
    </section>
  );
});

CompanyResultMonthListComponent.displayName = 'CompanyResultMonthList';

export const CompanyResultMonthList = CompanyResultMonthListComponent;
