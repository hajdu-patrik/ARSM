/**
 * Quote editor totals: net, VAT, and gross, straight from the server DTO.
 * The editor never sums lines itself, so the figure shown here is the same
 * one the PDF and the revenue report will use.
 * @module pages/Quotes/components/QuoteEditorModal.totals
 */
import { memo } from 'react';
import type { TFunction } from 'i18next';
import type { QuoteDetailDto } from '../../../types/quotes/quotes.types';
import { formatHuf } from '../../../utils/currency';
import {
  compactSectionHeadingTextClass,
  insetSurfaceClass,
  mutedMetaTextClass,
  numericValueTextClass,
} from '../../../utils/formStyles';

interface QuoteEditorTotalsSectionProps {
  readonly t: TFunction;
  readonly locale: string;
  readonly quote: QuoteDetailDto;
}

const totalRowClass = 'flex min-w-0 items-baseline justify-between gap-3';
const totalValueClass = numericValueTextClass;
const grandTotalValueClass = 'min-w-0 truncate text-right text-base font-semibold tabular-nums text-arsm-primary dark:text-arsm-primary-dark';

const QuoteEditorTotalsSectionComponent = memo(function QuoteEditorTotalsSection({
  t,
  locale,
  quote,
}: QuoteEditorTotalsSectionProps) {
  return (
    <section data-testid="quote-totals" className={`min-w-0 space-y-2 ${insetSurfaceClass} p-3.5`}>
      <h3 className={compactSectionHeadingTextClass}>{t('quotes.totalsTitle')}</h3>

      <div className={totalRowClass}>
        <span className={mutedMetaTextClass}>{t('quotes.columns.totalNet')}</span>
        <span data-testid="quote-total-net" className={totalValueClass}>{formatHuf(quote.totalNet, locale)}</span>
      </div>

      <div className={totalRowClass}>
        <span className={mutedMetaTextClass}>{t('quotes.columns.totalVat')}</span>
        <span data-testid="quote-total-vat" className={totalValueClass}>{formatHuf(quote.totalVat, locale)}</span>
      </div>

      <div className={`${totalRowClass} border-t border-arsm-border pt-2 dark:border-arsm-border-dark`}>
        <span className={mutedMetaTextClass}>{t('quotes.columns.totalGross')}</span>
        <span data-testid="quote-total-gross" className={grandTotalValueClass}>{formatHuf(quote.totalGross, locale)}</span>
      </div>
    </section>
  );
});

QuoteEditorTotalsSectionComponent.displayName = 'QuoteEditorTotalsSection';

export const QuoteEditorTotalsSection = QuoteEditorTotalsSectionComponent;
