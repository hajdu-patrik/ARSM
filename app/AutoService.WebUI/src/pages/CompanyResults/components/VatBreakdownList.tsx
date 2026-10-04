/** VAT breakdown of the accepted revenue: tax base and tax charged per rate, the pair an accountant reconciles first. */
import { memo } from 'react';
import type { TFunction } from 'i18next';
import { DataList, DataListRow, type DataListColumn } from '../../../components/common/DataList';
import type { CompanyResultVatRowDto } from '../../../types/reporting/company-results.types';
import { formatHuf } from '../../../utils/currency';
import {
  compactItemTitleClampTextClass,
  compactItemTitleTextClass,
  compactSectionHeadingTextClass,
  numericValueTextClass,
  numericValueWrapTextClass,
} from '../../../utils/formStyles';
import { MobileColumnStrip } from './MobileColumnStrip';
import { MobileStackedValues } from './MobileStackedValues';
import { mobileColumnsClass } from './mobileColumns';

interface VatBreakdownListProps {
  readonly t: TFunction;
  readonly locale: string;
  readonly rows: CompanyResultVatRowDto[];
}

/** Column grid shared by the header row and every VAT row via CSS subgrid. */
const vatColumnsClass = '@lg:grid-cols-[minmax(6rem,1.4fr)_minmax(6.5rem,auto)_minmax(6.5rem,auto)]';
const vatRateTextClass = `${compactItemTitleTextClass} tabular-nums`;
const vatRateWrapTextClass = `${compactItemTitleClampTextClass} tabular-nums`;

const VatBreakdownListComponent = memo(function VatBreakdownList({ t, locale, rows }: VatBreakdownListProps) {
  const columns: DataListColumn[] = [
    { key: 'vatRate', label: t('companyResults.vatRate') },
    { key: 'taxBase', label: t('companyResults.taxBase'), align: 'right' },
    { key: 'tax', label: t('companyResults.tax'), align: 'right' },
  ];

  return (
    <section className="min-w-0 space-y-3">
      <h2 className={compactSectionHeadingTextClass}>{t('companyResults.vatTitle')}</h2>

      <DataList
        breakpoint="lg"
        columnsClassName={vatColumnsClass}
        columns={columns}
        isEmpty={rows.length === 0}
        emptyText={t('companyResults.emptyVat')}
        emptyTestId="company-results-vat-empty"
      >
        <MobileColumnStrip columns={columns} />
        {rows.map((row) => (
          <DataListRow
            key={row.vatRatePercent}
            breakpoint="lg"
            testId="company-results-vat-row"
            desktop={(
              <>
                <p className={vatRateTextClass}>{row.vatRatePercent}%</p>
                <p className={numericValueTextClass}>{formatHuf(row.net, locale)}</p>
                <p className={`${numericValueTextClass} font-semibold`}>{formatHuf(row.vat, locale)}</p>
              </>
            )}
            mobile={(
              <>
                <div className={mobileColumnsClass}>
                  <p className={vatRateWrapTextClass}>{row.vatRatePercent}%</p>
                  <p className={numericValueWrapTextClass}>{formatHuf(row.net, locale)}</p>
                  <p className={`${numericValueWrapTextClass} font-semibold`}>{formatHuf(row.vat, locale)}</p>
                </div>
                <p className={`${vatRateWrapTextClass} min-[360px]:hidden`}>{row.vatRatePercent}%</p>
                <MobileStackedValues
                  values={[
                    { label: columns[1].label, value: formatHuf(row.net, locale) },
                    { label: columns[2].label, value: formatHuf(row.vat, locale), emphasized: true },
                  ]}
                />
              </>
            )}
          />
        ))}
      </DataList>
    </section>
  );
});

VatBreakdownListComponent.displayName = 'VatBreakdownList';

export const VatBreakdownList = VatBreakdownListComponent;
