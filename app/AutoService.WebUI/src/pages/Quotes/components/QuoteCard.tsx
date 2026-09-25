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
  compactRowActionsClusterClass,
  compactRowHeaderClass,
  compactTwoColumnGridClass,
  monoIdentifierTextClass,
  mutedBodyTextClass,
  numericValueTextClass,
  rowIconActionAccentClass,
  rowIconActionDangerClass,
  rowIconActionInfoClass,
  smallIconClass,
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

const quoteDateTextClass = `min-w-0 truncate tabular-nums ${mutedBodyTextClass}`;

const QuoteCardComponent = memo(function QuoteCard({ t, locale, quote, onOpen, onDownloadPdf, onDelete }: QuoteCardProps) {
  const displayStatus = resolveQuoteDisplayStatus(quote);
  const isDraft = quote.status === 'Draft';
  const openLabel = t('quotes.openQuote', { quoteNumber: quote.quoteNumber });
  const downloadLabel = t('quotes.downloadPdfFor', { quoteNumber: quote.quoteNumber });
  const deleteLabel = t('quotes.deleteQuote');

  const actions = (
    <div className={compactRowActionsClusterClass}>
      <button
        data-testid="quote-open-button"
        type="button"
        onClick={() => onOpen(quote)}
        className={rowIconActionInfoClass}
        title={openLabel}
        aria-label={openLabel}
      >
        <Eye className={smallIconClass} />
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
        <Download className={smallIconClass} />
      </button>
      <button
        data-testid="quote-delete-button"
        type="button"
        onClick={() => onDelete(quote)}
        disabled={!isDraft}
        className={rowIconActionDangerClass}
        title={isDraft ? deleteLabel : t('quotes.deleteDraftOnlyHint')}
        aria-label={deleteLabel}
      >
        <Trash2 className={smallIconClass} />
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
            <p className={monoIdentifierTextClass}>{quote.quoteNumber}</p>
          </div>
          <p className={monoIdentifierTextClass}>{quote.vehicle.licensePlate}</p>
          <QuoteStatusBadge status={displayStatus} className="justify-self-start" />
          <p className={quoteDateTextClass}>{formatQuoteDate(quote.validUntil, locale)}</p>
          <p className={numericValueTextClass}>{formatHuf(quote.totalNet, locale)}</p>
          <p className={`${numericValueTextClass} font-semibold`}>{formatHuf(quote.totalGross, locale)}</p>
          {actions}
        </>
      )}
      mobile={(
        <>
          <div className={compactRowHeaderClass}>
            <div className="min-w-0">
              <p className={compactItemTitleTextClass}>{quote.title}</p>
              <p className={monoIdentifierTextClass}>{quote.quoteNumber}</p>
            </div>
            {actions}
          </div>

          <QuoteStatusBadge status={displayStatus} />

          <div className={compactTwoColumnGridClass}>
            <LabeledValueTile label={t('common.fields.vehicle')} value={quote.vehicle.licensePlate} valueClassName="font-mono" />
            <LabeledValueTile label={t('quotes.validUntil')} value={formatQuoteDate(quote.validUntil, locale)} valueClassName="tabular-nums" />
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
