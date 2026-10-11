/** VAT breakdown of the accepted revenue: tax base and tax charged per rate, the pair an accountant reconciles first. */
import { memo } from 'react';
import type { TFunction } from 'i18next';
import { DataList, DataListCell, DataListRow, DataListText, type DataListColumn } from '../../../components/common/DataList';
import type { CompanyResultVatRowDto } from '../../../types/reporting/company-results.types';
import { formatHuf } from '../../../utils/currency';
import { compactSectionHeadingTextClass } from '../../../utils/formStyles';
import { formatQuantity } from '../../../utils/number';
import { MobileColumnStrip } from './MobileColumnStrip';
import { MobileStackedValues } from './MobileStackedValues';
import { mobileValuesClass } from './mobileColumns';

interface VatBreakdownListProps {
  readonly t: TFunction;
  readonly locale: string;
  readonly rows: CompanyResultVatRowDto[];
}

/** Column grid shared by the header row and every VAT row via CSS subgrid. */
const vatColumnsClass = '@lg:grid-cols-[minmax(6rem,1.4fr)_minmax(6.5rem,auto)_minmax(6.5rem,auto)]';

const VatBreakdownListComponent = memo(function VatBreakdownList({ t, locale, rows }: VatBreakdownListProps) {
  const rateColumn: DataListColumn = { key: 'vatRate', label: t('companyResults.vatRate') };
  const taxBaseColumn: DataListColumn = { key: 'taxBase', label: t('companyResults.taxBase'), align: 'right' };
  const taxColumn: DataListColumn = { key: 'tax', label: t('companyResults.tax'), align: 'right' };
  const columns = [rateColumn, taxBaseColumn, taxColumn];

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
        {rows.map((row) => {
          const rateText = `${formatQuantity(row.vatRatePercent, locale)}%`;

          return (
            <DataListRow key={row.vatRatePercent} testId="company-results-vat-row" valuesClassName={mobileValuesClass}>
              <DataListCell column={rateColumn.key} className="max-[359px]:mb-1">
                <DataListText kind="title" title={rateText} className="tabular-nums">{rateText}</DataListText>
              </DataListCell>
              <MobileStackedValues
                values={[
                  { column: taxBaseColumn.key, label: taxBaseColumn.label, value: formatHuf(row.net, locale), ellipsis: true },
                  { column: taxColumn.key, label: taxColumn.label, value: formatHuf(row.vat, locale), ellipsis: true, emphasized: true },
                ]}
              />
            </DataListRow>
          );
        })}
      </DataList>
    </section>
  );
});

VatBreakdownListComponent.displayName = 'VatBreakdownList';

export const VatBreakdownList = VatBreakdownListComponent;
