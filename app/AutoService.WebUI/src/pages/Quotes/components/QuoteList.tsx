/**
 * Quote list section: renders through `DataList` so the header and every row
 * share one column model, table from `@4xl` up, labeled tiles below it.
 * @module pages/Quotes/components/QuoteList
 */
import { memo } from 'react';
import type { TFunction } from 'i18next';
import { DataList, type DataListColumn } from '../../../components/common/DataList';
import type { QuoteListItemDto } from '../../../types/quotes/quotes.types';
import { QuoteCard } from './QuoteCard';

/** Column grid template shared by the list header and every row's desktop cells. */
const quoteColumnsClass = '@4xl:grid-cols-[minmax(10rem,1.7fr)_minmax(5rem,1fr)_minmax(5.5rem,auto)_minmax(6rem,auto)_minmax(6.5rem,auto)_minmax(6.5rem,auto)_auto]';

interface QuoteListProps {
  readonly t: TFunction;
  readonly locale: string;
  readonly quotes: QuoteListItemDto[];
  readonly isLoading: boolean;
  readonly onOpenQuote: (quote: QuoteListItemDto) => void;
  readonly onDownloadQuotePdf: (quote: QuoteListItemDto) => void;
  readonly onDeleteQuote: (quote: QuoteListItemDto) => void;
}

const QuoteListComponent = memo(function QuoteList({
  t,
  locale,
  quotes,
  isLoading,
  onOpenQuote,
  onDownloadQuotePdf,
  onDeleteQuote,
}: QuoteListProps) {
  const columns: DataListColumn[] = [
    { key: 'quote', label: t('quotes.columns.quote') },
    { key: 'vehicle', label: t('common.fields.vehicle') },
    { key: 'status', label: t('quotes.columns.status') },
    { key: 'validUntil', label: t('quotes.validUntil') },
    { key: 'totalNet', label: t('quotes.columns.totalNet'), align: 'right' },
    { key: 'totalGross', label: t('quotes.columns.totalGross'), align: 'right' },
    { key: 'actions', label: '' },
  ];

  return (
    <DataList
      breakpoint="4xl"
      columnsClassName={quoteColumnsClass}
      columns={columns}
      isLoading={isLoading}
      loadingText={t('quotes.loadingQuotes')}
      isEmpty={quotes.length === 0}
      emptyText={t('quotes.emptyQuotes')}
      emptyTestId="quotes-empty"
    >
      {quotes.map((quote) => (
        <QuoteCard
          key={quote.id}
          t={t}
          locale={locale}
          quote={quote}
          onOpen={onOpenQuote}
          onDownloadPdf={onDownloadQuotePdf}
          onDelete={onDeleteQuote}
        />
      ))}
    </DataList>
  );
});

QuoteListComponent.displayName = 'QuoteList';

export const QuoteList = QuoteListComponent;
