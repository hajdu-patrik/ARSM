/**
 * Quote list row.
 *
 * Renders the quote number, title, vehicle, status, validity and the net and
 * gross totals side by side from `md` up, collapsing to labeled value tiles
 * below it. Every amount comes from the server DTO; the row never computes
 * one.
 * @module pages/Quotes/components/QuoteCard
 */
import { memo } from 'react';
import type { TFunction } from 'i18next';
import { Eye, Trash2 } from 'lucide-react';
import type { QuoteListItemDto } from '../../../types/quotes/quotes.types';
import { formatHuf } from '../../../utils/currency';
import {
  compactDataSurfaceClass,
  compactItemTitleTextClass,
  compactPrimaryValueTextClass,
  compactTwoColumnGridClass,
  mutedMetaTextClass,
} from '../../../utils/formStyles';
import { formatQuoteDate, resolveQuoteDisplayStatus } from '../helpers';
import { QuoteStatusBadge } from './QuoteStatusBadge';

/** Column grid template shared by the row and the list header so both stay aligned. */
export const quoteRowGridClass = 'md:grid md:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)_minmax(5.5rem,auto)_minmax(6rem,auto)_minmax(6.5rem,auto)_minmax(6.5rem,auto)_auto] md:items-center md:gap-3';

interface QuoteCardProps {
  readonly t: TFunction;
  readonly locale: string;
  readonly quote: QuoteListItemDto;
  readonly onOpen: (quote: QuoteListItemDto) => void;
  readonly onDelete: (quote: QuoteListItemDto) => void;
}

const quoteActionIconClass = 'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-[color,transform] duration-150 ease-out hover:scale-105 motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/40 dark:focus-visible:ring-arsm-focus-ring/30';
const quoteOpenActionClass = `${quoteActionIconClass} text-arsm-info-text hover:text-arsm-info-ring dark:text-arsm-info-text-dark dark:hover:text-arsm-info-text-dark`;
const quoteDeleteActionClass = `${quoteActionIconClass} text-arsm-error-active hover:text-arsm-error-text dark:text-arsm-error-text-light dark:hover:text-arsm-error-text-light`;
const quoteNumberTextClass = 'min-w-0 truncate font-mono text-xs text-arsm-label dark:text-arsm-label-dark';
const quotePlateTextClass = 'min-w-0 truncate font-mono text-sm text-arsm-label dark:text-arsm-label-dark';
const quoteDateTextClass = 'min-w-0 truncate text-sm tabular-nums text-arsm-label dark:text-arsm-label-dark';
const quoteAmountTextClass = 'min-w-0 truncate text-right text-sm tabular-nums text-arsm-primary dark:text-arsm-primary-dark';

const QuoteCardComponent = memo(function QuoteCard({ t, locale, quote, onOpen, onDelete }: QuoteCardProps) {
  const displayStatus = resolveQuoteDisplayStatus(quote);
  const isDraft = quote.status === 'Draft';
  const openLabel = t('quotes.openQuote', { quoteNumber: quote.quoteNumber });
  const deleteLabel = t('quotes.deleteQuote');

  const actions = (
    <div className="flex shrink-0 items-center gap-1">
      <button
        data-testid="quote-open-button"
        type="button"
        onClick={() => onOpen(quote)}
        className={quoteOpenActionClass}
        title={openLabel}
        aria-label={openLabel}
      >
        <Eye className="h-3.5 w-3.5 shrink-0" />
      </button>
      {isDraft && (
        <button
          data-testid="quote-delete-button"
          type="button"
          onClick={() => onDelete(quote)}
          className={quoteDeleteActionClass}
          title={deleteLabel}
          aria-label={deleteLabel}
        >
          <Trash2 className="h-3.5 w-3.5 shrink-0" />
        </button>
      )}
    </div>
  );

  return (
    <div data-testid="quote-row" className="min-w-0 px-3 py-3 sm:px-3.5">
      <div className={`hidden min-w-0 ${quoteRowGridClass}`}>
        <div className="min-w-0">
          <p className={compactItemTitleTextClass}>{quote.title}</p>
          <p className={quoteNumberTextClass}>{quote.quoteNumber}</p>
        </div>
        <p className={quotePlateTextClass}>{quote.vehicle.licensePlate}</p>
        <QuoteStatusBadge status={displayStatus} className="justify-self-start" />
        <p className={quoteDateTextClass}>{formatQuoteDate(quote.validUntil, locale)}</p>
        <p className={quoteAmountTextClass}>{formatHuf(quote.totalNet, locale)}</p>
        <p className={`${quoteAmountTextClass} font-semibold`}>{formatHuf(quote.totalGross, locale)}</p>
        {actions}
      </div>

      <div className="min-w-0 space-y-2 md:hidden">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="min-w-0">
            <p className={compactItemTitleTextClass}>{quote.title}</p>
            <p className={quoteNumberTextClass}>{quote.quoteNumber}</p>
          </div>
          {actions}
        </div>

        <QuoteStatusBadge status={displayStatus} />

        <div className={compactTwoColumnGridClass}>
          <div className={compactDataSurfaceClass}>
            <p className={mutedMetaTextClass}>{t('quotes.columns.vehicle')}</p>
            <p className={`truncate font-mono ${compactPrimaryValueTextClass}`}>{quote.vehicle.licensePlate}</p>
          </div>
          <div className={compactDataSurfaceClass}>
            <p className={mutedMetaTextClass}>{t('quotes.columns.validUntil')}</p>
            <p className={`truncate tabular-nums ${compactPrimaryValueTextClass}`}>{formatQuoteDate(quote.validUntil, locale)}</p>
          </div>
          <div className={compactDataSurfaceClass}>
            <p className={mutedMetaTextClass}>{t('quotes.columns.totalNet')}</p>
            <p className={`truncate text-right tabular-nums ${compactPrimaryValueTextClass}`}>{formatHuf(quote.totalNet, locale)}</p>
          </div>
          <div className={compactDataSurfaceClass}>
            <p className={mutedMetaTextClass}>{t('quotes.columns.totalGross')}</p>
            <p className={`truncate text-right font-semibold tabular-nums ${compactPrimaryValueTextClass}`}>{formatHuf(quote.totalGross, locale)}</p>
          </div>
        </div>
      </div>
    </div>
  );
});

QuoteCardComponent.displayName = 'QuoteCard';

export const QuoteCard = QuoteCardComponent;
