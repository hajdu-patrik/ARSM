/**
 * Quote list section: the column header from `md` up, the rows, and the
 * loading and empty states.
 * @module pages/Quotes/components/QuoteList
 */
import { memo } from 'react';
import type { TFunction } from 'i18next';
import type { QuoteListItemDto } from '../../../types/quotes/quotes.types';
import { contentCardFrameClass, mutedSecondaryTextClass } from '../../../utils/formStyles';
import { QuoteCard, quoteRowGridClass } from './QuoteCard';

interface QuoteListProps {
  readonly t: TFunction;
  readonly locale: string;
  readonly quotes: QuoteListItemDto[];
  readonly isLoading: boolean;
  readonly onOpenQuote: (quote: QuoteListItemDto) => void;
  readonly onDeleteQuote: (quote: QuoteListItemDto) => void;
}

const QuoteListComponent = memo(function QuoteList({
  t,
  locale,
  quotes,
  isLoading,
  onOpenQuote,
  onDeleteQuote,
}: QuoteListProps) {
  return (
    <section className={`min-w-0 ${contentCardFrameClass}`}>
      <div className={`hidden ${quoteRowGridClass} border-b border-arsm-border px-3 py-2 text-xs font-medium uppercase tracking-wide text-arsm-muted dark:border-arsm-border-dark dark:text-arsm-muted-dark sm:px-3.5`}>
        <span>{t('quotes.columns.quote')}</span>
        <span>{t('quotes.columns.vehicle')}</span>
        <span>{t('quotes.columns.status')}</span>
        <span>{t('quotes.columns.validUntil')}</span>
        <span className="text-right">{t('quotes.columns.totalNet')}</span>
        <span className="text-right">{t('quotes.columns.totalGross')}</span>
        <span aria-hidden="true" />
      </div>

      {isLoading && <p className={`px-3.5 py-6 text-center ${mutedSecondaryTextClass}`}>{t('quotes.loadingQuotes')}</p>}
      {!isLoading && quotes.length === 0 && (
        <p data-testid="quotes-empty" className={`px-3.5 py-6 text-center ${mutedSecondaryTextClass}`}>{t('quotes.emptyQuotes')}</p>
      )}
      {!isLoading && quotes.length > 0 && (
        <div className="min-w-0 divide-y divide-arsm-border/80 dark:divide-arsm-border-dark/80">
          {quotes.map((quote) => (
            <QuoteCard
              key={quote.id}
              t={t}
              locale={locale}
              quote={quote}
              onOpen={onOpenQuote}
              onDelete={onDeleteQuote}
            />
          ))}
        </div>
      )}
    </section>
  );
});

QuoteListComponent.displayName = 'QuoteList';

export const QuoteList = QuoteListComponent;
