/**
 * VAT breakdown of the accepted revenue: the tax base and the tax charged per
 * rate, the pair an accountant reconciles first.
 * @module pages/CompanyResults/components/VatBreakdownList
 */
import { memo } from 'react';
import type { TFunction } from 'i18next';
import type { CompanyResultVatRowDto } from '../../../types/reporting/company-results.types';
import { formatHuf } from '../../../utils/currency';
import {
  compactDataSurfaceClass,
  compactSectionHeadingTextClass,
  contentCardFrameClass,
  mutedMetaTextClass,
  mutedSecondaryTextClass,
} from '../../../utils/formStyles';

interface VatBreakdownListProps {
  readonly t: TFunction;
  readonly locale: string;
  readonly rows: CompanyResultVatRowDto[];
}

const vatRowGridClass = 'sm:grid sm:grid-cols-[minmax(4rem,auto)_minmax(0,1fr)_minmax(0,1fr)] sm:items-center sm:gap-3';
const vatValueClass = 'min-w-0 truncate text-right text-sm tabular-nums text-arsm-primary dark:text-arsm-primary-dark';

const VatBreakdownListComponent = memo(function VatBreakdownList({ t, locale, rows }: VatBreakdownListProps) {
  return (
    <section className="min-w-0 space-y-3">
      <h2 className={compactSectionHeadingTextClass}>{t('companyResults.vatTitle')}</h2>

      <div className={`min-w-0 ${contentCardFrameClass}`}>
        <div className={`hidden ${vatRowGridClass} border-b border-arsm-border px-3 py-2 text-xs font-medium uppercase tracking-wide text-arsm-muted dark:border-arsm-border-dark dark:text-arsm-muted-dark sm:px-3.5`}>
          <span>{t('companyResults.vatRate')}</span>
          <span className="text-right">{t('companyResults.taxBase')}</span>
          <span className="text-right">{t('companyResults.tax')}</span>
        </div>

        {rows.length === 0 && (
          <p data-testid="company-results-vat-empty" className={`px-3.5 py-6 text-center ${mutedSecondaryTextClass}`}>
            {t('companyResults.emptyVat')}
          </p>
        )}

        {rows.length > 0 && (
          <div className="min-w-0 divide-y divide-arsm-border/80 dark:divide-arsm-border-dark/80">
            {rows.map((row) => (
              <div key={row.vatRatePercent} data-testid="company-results-vat-row" className="min-w-0 px-3 py-3 sm:px-3.5">
                <div className={`hidden min-w-0 ${vatRowGridClass}`}>
                  <p className="min-w-0 truncate text-sm tabular-nums text-arsm-primary dark:text-arsm-primary-dark">{row.vatRatePercent}%</p>
                  <p className={vatValueClass}>{formatHuf(row.net, locale)}</p>
                  <p className={`${vatValueClass} font-semibold`}>{formatHuf(row.vat, locale)}</p>
                </div>

                <div className="min-w-0 space-y-2 sm:hidden">
                  <p className="min-w-0 truncate text-sm tabular-nums text-arsm-primary dark:text-arsm-primary-dark">{row.vatRatePercent}%</p>
                  <div className="grid min-w-0 grid-cols-1 gap-2">
                    <div className={compactDataSurfaceClass}>
                      <p className={mutedMetaTextClass}>{t('companyResults.taxBase')}</p>
                      <p className={vatValueClass}>{formatHuf(row.net, locale)}</p>
                    </div>
                    <div className={compactDataSurfaceClass}>
                      <p className={mutedMetaTextClass}>{t('companyResults.tax')}</p>
                      <p className={`${vatValueClass} font-semibold`}>{formatHuf(row.vat, locale)}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
});

VatBreakdownListComponent.displayName = 'VatBreakdownList';

export const VatBreakdownList = VatBreakdownListComponent;
