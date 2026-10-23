/** Quote list row via DataListRow (one DOM, `@4xl` table or tiles); every amount comes from the server DTO, never computed here. */
import { memo } from 'react';
import type { TFunction } from 'i18next';
import { Download, Eye, Trash2 } from 'lucide-react';
import { HighlightedText } from '../../../components/common/HighlightedText';
import { DataListCell, DataListRow, DataListText } from '../../../components/common/DataList';
import type { QuoteListItemDto } from '../../../types/quotes/quotes.types';
import { formatHuf } from '../../../utils/currency';
import {
  compactRowActionsClusterClass,
  compactTwoColumnFixedGridClass,
  rowIconActionAccentClass,
  rowIconActionDangerClass,
  rowIconActionInfoClass,
  smallIconClass,
} from '../../../utils/formStyles';
import { formatShortDate } from '../../../utils/intlFormat';
import { resolveQuoteDisplayStatus } from '../helpers';
import { QuoteStatusBadge } from './QuoteStatusBadge';

interface QuoteCardProps {
  readonly t: TFunction;
  readonly locale: string;
  readonly quote: QuoteListItemDto;
  readonly searchQuery: string;
  readonly onOpen: (quote: QuoteListItemDto) => void;
  readonly onDownloadPdf: (quote: QuoteListItemDto) => void;
  readonly onDelete: (quote: QuoteListItemDto) => void;
}

/** Tile layout: the status badge takes its own line above the value tiles. */
const statusTileClass = '@max-4xl:order-first @max-4xl:col-span-2';

interface QuoteRowActionsProps {
  readonly t: TFunction;
  readonly quote: QuoteListItemDto;
  readonly onOpen: (quote: QuoteListItemDto) => void;
  readonly onDownloadPdf: (quote: QuoteListItemDto) => void;
  readonly onDelete: (quote: QuoteListItemDto) => void;
}

/** Delete button title: the plain label when allowed, else the reason it is not. */
function resolveDeleteTitle(t: TFunction, quote: QuoteListItemDto): string {
  if (quote.canDelete) {
    return t('quotes.deleteQuote');
  }

  return t(quote.lockReason === 'appointment_completed'
    ? 'quotes.deleteLockedAppointmentCompletedHint'
    : 'quotes.deleteDraftOnlyHint');
}

/** Open, download and delete icon actions of one quote row. */
function QuoteRowActions({ t, quote, onOpen, onDownloadPdf, onDelete }: QuoteRowActionsProps) {
  const openLabel = t('quotes.openQuote', { quoteNumber: quote.quoteNumber });
  const downloadLabel = t('quotes.downloadPdfFor', { quoteNumber: quote.quoteNumber });
  const deleteLabel = t('quotes.deleteQuote');
  const deleteTitle = resolveDeleteTitle(t, quote);

  return (
    <div className={compactRowActionsClusterClass}>
      <button
        data-testid="quote-open-button"
        type="button"
        onClick={() => { onOpen(quote); }}
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
        onClick={() => { onDownloadPdf(quote); }}
        className={rowIconActionAccentClass}
        title={downloadLabel}
        aria-label={downloadLabel}
      >
        <Download className={smallIconClass} />
      </button>
      <button
        data-testid="quote-delete-button"
        type="button"
        onClick={() => { onDelete(quote); }}
        disabled={!quote.canDelete}
        className={rowIconActionDangerClass}
        title={deleteTitle}
        aria-label={quote.canDelete ? deleteLabel : `${deleteLabel}: ${deleteTitle}`}
      >
        <Trash2 className={smallIconClass} />
      </button>
    </div>
  );
}

export const QuoteCard = memo(function QuoteCard({ t, locale, quote, searchQuery, onOpen, onDownloadPdf, onDelete }: QuoteCardProps) {
  const licensePlate = quote.vehicle.licensePlate;
  const validUntilText = formatShortDate(quote.validUntil, locale);
  const totalNetText = formatHuf(quote.totalNet, locale);
  const totalGrossText = formatHuf(quote.totalGross, locale);

  return (
    <DataListRow
      testId="quote-row"
      valuesClassName={compactTwoColumnFixedGridClass}
      lead={(
        <DataListCell column="quote">
          <DataListText kind="title" title={quote.title}><HighlightedText text={quote.title} query={searchQuery} /></DataListText>
          <DataListText kind="reference" title={quote.quoteNumber}><HighlightedText text={quote.quoteNumber} query={searchQuery} /></DataListText>
        </DataListCell>
      )}
      actions={(
        <DataListCell column="actions" headerEnd>
          <QuoteRowActions t={t} quote={quote} onOpen={onOpen} onDownloadPdf={onDownloadPdf} onDelete={onDelete} />
        </DataListCell>
      )}
    >
      <DataListCell column="vehicle" label={t('common.fields.vehicle')} tile>
        <DataListText kind="identifier" title={licensePlate}><HighlightedText text={licensePlate} query={searchQuery} /></DataListText>
      </DataListCell>
      <DataListCell column="status" className={statusTileClass}>
        <QuoteStatusBadge status={resolveQuoteDisplayStatus(quote)} />
      </DataListCell>
      <DataListCell column="validUntil" label={t('quotes.validUntil')} tile>
        <DataListText kind="date" title={validUntilText}>{validUntilText}</DataListText>
      </DataListCell>
      <DataListCell column="totalNet" label={t('quotes.columns.totalNet')} tile>
        <DataListText kind="amount" title={totalNetText}>{totalNetText}</DataListText>
      </DataListCell>
      <DataListCell column="totalGross" label={t('quotes.columns.totalGross')} tile>
        <DataListText kind="amount" title={totalGrossText} className="font-semibold">{totalGrossText}</DataListText>
      </DataListCell>
    </DataListRow>
  );
});
