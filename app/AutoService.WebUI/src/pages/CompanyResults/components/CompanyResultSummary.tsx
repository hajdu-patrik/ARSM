/**
 * The headline of the report: accepted net and gross, with the pending,
 * expired and rejected amounts beside it at a lower weight.
 *
 * Sent is split in two, because a quote past its validity is not something to
 * count on any more; a draft never reached the customer, so it appears as a
 * count only. Every amount comes from the server DTO and prints as whole
 * forints.
 * @module pages/CompanyResults/components/CompanyResultSummary
 */
import { memo } from 'react';
import type { TFunction } from 'i18next';
import type {
  CompanyResultDto,
  CompanyResultStatusRowDto,
} from '../../../types/reporting/company-results.types';
import { formatHuf } from '../../../utils/currency';
import {
  cardClass,
  compactDataSurfaceClass,
  compactSectionHeadingTextClass,
  compactTwoColumnGridClass,
  insetSurfaceClass,
  mutedMetaTextClass,
} from '../../../utils/formStyles';

interface CompanyResultSummaryProps {
  readonly t: TFunction;
  readonly locale: string;
  readonly result: CompanyResultDto;
}

const headlineValueClass = 'truncate text-2xl font-semibold tabular-nums text-arsm-primary dark:text-arsm-primary-dark';
const secondaryValueClass = 'truncate text-sm font-semibold tabular-nums text-arsm-primary dark:text-arsm-primary-dark';
const countTextClass = 'truncate text-xs tabular-nums text-arsm-muted dark:text-arsm-muted-dark';

const CompanyResultSummaryComponent = memo(function CompanyResultSummary({
  t,
  locale,
  result,
}: CompanyResultSummaryProps) {
  const secondaryRows: Array<{ key: string; label: string; row: CompanyResultStatusRowDto }> = [
    { key: 'pending', label: t('companyResults.rows.pending'), row: result.pending },
    { key: 'expired', label: t('companyResults.rows.expired'), row: result.expired },
    { key: 'rejected', label: t('companyResults.rows.rejected'), row: result.rejected },
  ];

  return (
    <section className={`${cardClass} min-w-0 space-y-4`}>
      <div data-testid="company-results-accepted" className={`${insetSurfaceClass} min-w-0 space-y-2 p-3.5`}>
        <h2 className={compactSectionHeadingTextClass}>{t('companyResults.rows.accepted')}</h2>
        <div className={compactTwoColumnGridClass}>
          <div className={compactDataSurfaceClass}>
            <p className={mutedMetaTextClass}>{t('companyResults.net')}</p>
            <p data-testid="company-results-accepted-net" className={headlineValueClass}>{formatHuf(result.accepted.net, locale)}</p>
          </div>
          <div className={compactDataSurfaceClass}>
            <p className={mutedMetaTextClass}>{t('companyResults.gross')}</p>
            <p data-testid="company-results-accepted-gross" className={headlineValueClass}>{formatHuf(result.accepted.gross, locale)}</p>
          </div>
        </div>
        <p className={countTextClass}>{t('companyResults.quoteCount', { count: result.accepted.quoteCount })}</p>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-3">
        {secondaryRows.map((entry) => (
          <div key={entry.key} data-testid={`company-results-${entry.key}`} className={compactDataSurfaceClass}>
            <p className={mutedMetaTextClass}>{entry.label}</p>
            <p className={secondaryValueClass}>{formatHuf(entry.row.gross, locale)}</p>
            <p className={countTextClass}>
              {t('companyResults.netAndCount', {
                net: formatHuf(entry.row.net, locale),
                count: entry.row.quoteCount,
              })}
            </p>
          </div>
        ))}
      </div>

      <div className={compactTwoColumnGridClass}>
        {result.acceptedByLineKind.map((row) => (
          <div key={row.lineKind} data-testid={`company-results-kind-${row.lineKind.toLowerCase()}`} className={compactDataSurfaceClass}>
            <p className={mutedMetaTextClass}>
              {row.lineKind === 'Labor' ? t('companyResults.laborRevenue') : t('companyResults.partsRevenue')}
            </p>
            <p className={secondaryValueClass}>{formatHuf(row.gross, locale)}</p>
            <p className={countTextClass}>{t('companyResults.netOnly', { net: formatHuf(row.net, locale) })}</p>
          </div>
        ))}
      </div>

      <p className={mutedMetaTextClass}>{t('companyResults.draftCount', { count: result.draftQuoteCount })}</p>
    </section>
  );
});

CompanyResultSummaryComponent.displayName = 'CompanyResultSummary';

export const CompanyResultSummary = CompanyResultSummaryComponent;
