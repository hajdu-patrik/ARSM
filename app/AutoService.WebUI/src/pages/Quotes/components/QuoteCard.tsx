/** Quote list row via DataListRow (shared column model, `@4xl` tile collapse); every amount comes from the server DTO, never computed here. */
import { memo } from 'react';
import type { TFunction } from 'i18next';
import { Download, Eye, Trash2 } from 'lucide-react';
import { DataListRow } from '../../../components/common/DataList';
import { LabeledValueTile } from '../../../components/common/LabeledValueTile';
import type { QuoteListItemDto } from '../../../types/quotes/quotes.types';
import { formatHuf } from '../../../utils/currency';
import {
  compactItemTitleClampTextClass,
  compactItemTitleTextClass,
  compactRowActionsClusterClass,
  compactRowHeaderClass,
  compactTwoColumnFixedGridClass,
  monoIdentifierTextClass,
  monoIdentifierWrapTextClass,
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
  const validUntilText = formatQuoteDate(quote.validUntil, locale);
  const totalNetText = formatHuf(quote.totalNet, locale);
  const totalGrossText = formatHuf(quote.totalGross, locale);

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
      {/* Printing isn't info/edit/delete, so it keeps the accent tone the new-quote action uses. */}
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
            <p className={compactItemTitleTextClass} title={quote.title}>{quote.title}</p>
            <p className={monoIdentifierTextClass} title={quote.quoteNumber}>{quote.quoteNumber}</p>
          </div>
          <p className={monoIdentifierTextClass} title={quote.vehicle.licensePlate}>{quote.vehicle.licensePlate}</p>
          <QuoteStatusBadge status={displayStatus} className="justify-self-start" />
          <p className={quoteDateTextClass} title={validUntilText}>{validUntilText}</p>
          <p className={numericValueTextClass} title={totalNetText}>{totalNetText}</p>
          <p className={`${numericValueTextClass} font-semibold`} title={totalGrossText}>{totalGrossText}</p>
          {actions}
        </>
      )}
      mobile={(
        <>
          <div className={compactRowHeaderClass}>
            <div className="min-w-0">
              <p className={compactItemTitleClampTextClass}>{quote.title}</p>
              <p className={monoIdentifierWrapTextClass}>{quote.quoteNumber}</p>
            </div>
            {actions}
          </div>

          <QuoteStatusBadge status={displayStatus} />

          <div className={compactTwoColumnFixedGridClass}>
            <LabeledValueTile label={t('common.fields.vehicle')} value={quote.vehicle.licensePlate} valueClassName="font-mono" />
            <LabeledValueTile label={t('quotes.validUntil')} value={validUntilText} valueClassName="tabular-nums" />
            <LabeledValueTile label={t('quotes.columns.totalNet')} value={totalNetText} valueClassName="text-right tabular-nums" />
            <LabeledValueTile label={t('quotes.columns.totalGross')} value={totalGrossText} valueClassName="text-right font-semibold tabular-nums" />
          </div>
        </>
      )}
    />
  );
});

QuoteCardComponent.displayName = 'QuoteCard';

export const QuoteCard = QuoteCardComponent;
