/**
 * VAT breakdown of the accepted revenue: the tax base and the tax charged per
 * rate, the pair an accountant reconciles first.
 * @module pages/CompanyResults/components/VatBreakdownList
 */
import { memo } from 'react';
import type { TFunction } from 'i18next';
import { DataList, DataListRow, type DataListColumn } from '../../../components/common/DataList';
import { LabeledValueTile } from '../../../components/common/LabeledValueTile';
import type { CompanyResultVatRowDto } from '../../../types/reporting/company-results.types';
import { formatHuf } from '../../../utils/currency';
import {
  compactItemTitleTextClass,
  compactSectionHeadingTextClass,
  compactTwoColumnGridClass,
  numericValueTextClass,
} from '../../../utils/formStyles';

interface VatBreakdownListProps {
  readonly t: TFunction;
  readonly locale: string;
  readonly rows: CompanyResultVatRowDto[];
}

/** Column grid shared by the header row and every VAT row via CSS subgrid. */
const vatColumnsClass = '@lg:grid-cols-[minmax(6rem,1.4fr)_minmax(6.5rem,auto)_minmax(6.5rem,auto)]';
const vatRateTextClass = `${compactItemTitleTextClass} tabular-nums`;

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
                <p className={vatRateTextClass}>{row.vatRatePercent}%</p>
                <div className={compactTwoColumnGridClass}>
                  <LabeledValueTile
                    label={t('companyResults.taxBase')}
                    value={formatHuf(row.net, locale)}
                    valueClassName="text-right tabular-nums"
                  />
                  <LabeledValueTile
                    label={t('companyResults.tax')}
                    value={formatHuf(row.vat, locale)}
                    valueClassName="text-right tabular-nums font-semibold"
                  />
                </div>
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
