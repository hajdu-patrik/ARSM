/** Quotes page: search/status list plus the editor modal; creation always starts from a vehicle row (`?vehicleId=<id>&new=1`, see CLAUDE.md); `?quoteId=<id>` opens that quote. */
import { memo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { Pagination } from '../../components/common/Pagination';
import { useToastStore } from '../../store/toast.store';
import type { QuoteListItemDto } from '../../types/quotes/quotes.types';
import {
  pageHeaderWithSubtitleClass,
  pageShellClass,
  pageSubtitleClass,
  pageTitleClass,
} from '../../utils/formStyles';
import { useQuotesListState } from './hooks/useQuotesListState';
import { useQuoteEditor } from './hooks/useQuoteEditor';
import { useQuoteMutations } from './hooks/useQuoteMutations';
import { useQuoteReferenceData } from './hooks/useQuoteReferenceData';
import { QuotesToolbar } from './components/QuotesToolbar';
import { QuoteList } from './components/QuoteList';
import { QuoteEditorModal } from './components/QuoteEditorModal';
import { DeleteQuoteModal } from './components/DeleteQuoteModal';

export const QuotesPage = memo(function QuotesPage() {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const showSuccessToast = useToastStore((state) => state.showSuccess);
  const showErrorToast = useToastStore((state) => state.showError);

  const { list: listState, listRef } = useQuotesListState({ showErrorToast });
  const editor = useQuoteEditor({ showErrorToast });
  const mutations = useQuoteMutations({ showSuccessToast, showErrorToast, editor });
  const reference = useQuoteReferenceData({
    isOpen: editor.isOpen,
    vehicleId: editor.vehicleId,
    showErrorToast,
  });

  const isCreateRequested = searchParams.get('new') === '1';
  const requestedVehicleId = searchParams.get('vehicleId');
  const { openCreate, openQuote } = editor;
  const { handleDownloadPdf, openDeleteModal } = mutations;

  useEffect(() => {
    if (!isCreateRequested) {
      return;
    }

    const vehicleId = Number(requestedVehicleId);

    // The parameters are consumed once: a reload should land on the plain
    // list rather than reopening a draft the mechanic already abandoned.
    setSearchParams(new URLSearchParams(), { replace: true });

    if (Number.isInteger(vehicleId) && vehicleId > 0) {
      openCreate(vehicleId);
    }
  }, [isCreateRequested, openCreate, requestedVehicleId, setSearchParams]);

  const requestedQuoteId = searchParams.get('quoteId');

  useEffect(() => {
    if (requestedQuoteId === null) {
      return;
    }

    const quoteId = Number(requestedQuoteId);

    // Consumed once, like the create parameters above.
    setSearchParams(new URLSearchParams(), { replace: true });

    if (Number.isInteger(quoteId) && quoteId > 0) {
      openQuote(quoteId);
    }
  }, [openQuote, requestedQuoteId, setSearchParams]);

  const handleOpenQuote = useCallback((quote: QuoteListItemDto) => {
    openQuote(quote.id);
  }, [openQuote]);

  return (
    <div className={`${pageShellClass} flex flex-col gap-6`}>
      <header className={pageHeaderWithSubtitleClass}>
        <h1 className={pageTitleClass}>{t('nav.quotes')}</h1>
        <p className={pageSubtitleClass}>{t('quotes.pageDescription')}</p>
      </header>

      <QuotesToolbar
        t={t}
        searchTerm={listState.searchTerm}
        statusFilter={listState.statusFilter}
        onSearchChange={listState.setSearchTerm}
        onClearSearch={listState.clearSearch}
        onStatusFilterChange={listState.setStatusFilter}
      />

      <div ref={listRef} className="min-w-0">
        <QuoteList
          t={t}
          locale={i18n.language}
          quotes={listState.quotes}
          searchQuery={listState.debouncedSearch}
          isLoading={listState.isLoading}
          onOpenQuote={handleOpenQuote}
          onDownloadQuotePdf={handleDownloadPdf}
          onDeleteQuote={openDeleteModal}
        />
      </div>

      <Pagination
        page={listState.page}
        totalCount={listState.totalCount}
        pageSize={listState.pageSize}
        onPageChange={listState.setPage}
        isLoading={listState.isFetching}
        testIdPrefix="quotes-pagination"
      />

      <QuoteEditorModal
        t={t}
        locale={i18n.language}
        editor={editor}
        mutations={mutations}
        reference={reference}
      />

      <DeleteQuoteModal
        target={mutations.deleteTarget}
        isDeleting={mutations.isDeletingQuote}
        t={t}
        onClose={mutations.closeDeleteModal}
        onConfirm={mutations.handleDeleteQuote}
      />
    </div>
  );
});
