/**
 * Quote list row.
 *
 * Renders through `DataListRow` so the header and every row share one column
 * model: quote number/title, vehicle, status, validity and the net and gross
 * totals side by side above the list's own `@4xl` container width,
 * collapsing to labeled value tiles below it. Every amount comes from the
 * server DTO; the row never computes one.
 * @module pages/Quotes/components/QuoteCard
 */
import { memo } from 'react';
import type { TFunction } from 'i18next';
import { Download, Eye, Trash2 } from 'lucide-react';
import { DataListRow } from '../../../components/common/DataList';
import { LabeledValueTile } from '../../../components/common/LabeledValueTile';
import type { QuoteListItemDto } from '../../../types/quotes/quotes.types';
import { formatHuf } from '../../../utils/currency';
import {
  compactItemTitleTextClass,
  compactTwoColumnGridClass,
  numericValueTextClass,
  rowIconActionAccentClass,
  rowIconActionDangerClass,
  rowIconActionInfoClass,
} from '../../../utils/formStyles';
import { formatQuoteDate, resolveQuoteDisplayStatus } from '../helpers';
import { QuoteStatusBadge } from './QuoteStatusBadge';

interface QuoteCardProps {
  readonly t: TFunction;
  readonly locale: string;
  readonly quote: QuoteListItemDto;
  readonly onOpen: (quote: QuoteListItemDto) => void;
  readonly onDownloadPdf: (quote: QuoteListItemDto) => void;
  readonly onDelete: (quote: QuoteListItemDto) => void;
}

const quoteNumberTextClass = 'min-w-0 truncate font-mono text-xs text-arsm-label dark:text-arsm-label-dark';
const quotePlateTextClass = 'min-w-0 truncate font-mono text-sm text-arsm-label dark:text-arsm-label-dark';
const quoteDateTextClass = 'min-w-0 truncate text-sm tabular-nums text-arsm-label dark:text-arsm-label-dark';

const QuoteCardComponent = memo(function QuoteCard({ t, locale, quote, onOpen, onDownloadPdf, onDelete }: QuoteCardProps) {
  const displayStatus = resolveQuoteDisplayStatus(quote);
  const isDraft = quote.status === 'Draft';
  const openLabel = t('quotes.openQuote', { quoteNumber: quote.quoteNumber });
  const downloadLabel = t('quotes.downloadPdfFor', { quoteNumber: quote.quoteNumber });
  const deleteLabel = t('quotes.deleteQuote');

  const actions = (
    <div className="flex shrink-0 items-center gap-1 max-[350px]:flex-wrap max-[350px]:justify-end">
      <button
        data-testid="quote-open-button"
        type="button"
        onClick={() => onOpen(quote)}
        className={rowIconActionInfoClass}
        title={openLabel}
        aria-label={openLabel}
      >
        <Eye className="h-3.5 w-3.5 shrink-0" />
      </button>
      {/* Printing is neither info, edit nor delete, so it keeps the accent tone
          the new-quote action uses rather than borrowing one of the three
          semantics. */}
      <button
        data-testid="quote-download-button"
        type="button"
        onClick={() => onDownloadPdf(quote)}
        className={rowIconActionAccentClass}
        title={downloadLabel}
        aria-label={downloadLabel}
      >
        <Download className="h-3.5 w-3.5 shrink-0" />
      </button>
      <button
        data-testid="quote-delete-button"
        type="button"
        onClick={() => onDelete(quote)}
        disabled={!isDraft}
        className={`${rowIconActionDangerClass} dark:disabled:opacity-45`}
        title={isDraft ? deleteLabel : t('quotes.deleteDraftOnlyHint')}
        aria-label={deleteLabel}
      >
        <Trash2 className="h-3.5 w-3.5 shrink-0" />
      </button>
    </div>
  );

  return (
    <DataListRow
      breakpoint="4xl"
      testId="quote-row"
      desktop={(
        <>
          <div className="min-w-0">
            <p className={compactItemTitleTextClass}>{quote.title}</p>
            <p className={quoteNumberTextClass}>{quote.quoteNumber}</p>
          </div>
          <p className={quotePlateTextClass}>{quote.vehicle.licensePlate}</p>
          <QuoteStatusBadge status={displayStatus} className="justify-self-start" />
          <p className={quoteDateTextClass}>{formatQuoteDate(quote.validUntil, locale)}</p>
          <p className={numericValueTextClass}>{formatHuf(quote.totalNet, locale)}</p>
          <p className={`${numericValueTextClass} font-semibold`}>{formatHuf(quote.totalGross, locale)}</p>
          {actions}
        </>
      )}
      mobile={(
        <>
          <div className="flex min-w-0 items-start justify-between gap-2">
            <div className="min-w-0">
              <p className={compactItemTitleTextClass}>{quote.title}</p>
              <p className={quoteNumberTextClass}>{quote.quoteNumber}</p>
            </div>
            {actions}
          </div>

          <QuoteStatusBadge status={displayStatus} />

          <div className={compactTwoColumnGridClass}>
            <LabeledValueTile label={t('quotes.columns.vehicle')} value={quote.vehicle.licensePlate} valueClassName="font-mono" />
            <LabeledValueTile label={t('quotes.columns.validUntil')} value={formatQuoteDate(quote.validUntil, locale)} valueClassName="tabular-nums" />
            <LabeledValueTile label={t('quotes.columns.totalNet')} value={formatHuf(quote.totalNet, locale)} valueClassName="text-right tabular-nums" />
            <LabeledValueTile label={t('quotes.columns.totalGross')} value={formatHuf(quote.totalGross, locale)} valueClassName="text-right font-semibold tabular-nums" />
          </div>
        </>
      )}
    />
  );
});

QuoteCardComponent.displayName = 'QuoteCard';

export const QuoteCard = QuoteCardComponent;
