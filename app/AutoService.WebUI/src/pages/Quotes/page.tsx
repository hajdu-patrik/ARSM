/**
 * Quotes page.
 *
 * Lists every quote with search and status filtering, and hosts the editor
 * modal that creates a draft, edits its lines, and moves it through the
 * status flow. A quote is always anchored to a vehicle, so creation starts
 * from a vehicle row on the Customers page and arrives here as
 * `?vehicleId=<id>&new=1`.
 * @module pages/Quotes/page
 */
import { memo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
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

const QuotesPageComponent = memo(function QuotesPage() {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const showSuccessToast = useToastStore((state) => state.showSuccess);
  const showErrorToast = useToastStore((state) => state.showError);

  const listState = useQuotesListState({ showErrorToast });
  const editor = useQuoteEditor({ showErrorToast });
  const mutations = useQuoteMutations({
    showSuccessToast,
    showErrorToast,
    editor,
    reloadQuotes: listState.load,
  });
  const reference = useQuoteReferenceData({
    isOpen: editor.isOpen,
    vehicleId: editor.vehicleId,
    showErrorToast,
  });

  const isCreateRequested = searchParams.get('new') === '1';
  const requestedVehicleId = searchParams.get('vehicleId');
  const { openCreate, openQuote } = editor;

  useEffect(() => {
    if (!isCreateRequested) {
      return;
    }

    const vehicleId = Number(requestedVehicleId);

    // The parameters are consumed once: a reload should land on the plain
    // list rather than reopening a draft the mechanic already abandoned.
    setSearchParams(new URLSearchParams(), { replace: true });

    if (Number.isInteger(vehicleId) && vehicleId > 0) {
      void openCreate(vehicleId);
    }
  }, [isCreateRequested, openCreate, requestedVehicleId, setSearchParams]);

  const handleOpenQuote = useCallback((quote: QuoteListItemDto) => {
    void openQuote(quote.id);
  }, [openQuote]);

  const handleRequestDelete = useCallback((quote: QuoteListItemDto) => {
    mutations.openDeleteModal({
      id: quote.id,
      quoteNumber: quote.quoteNumber,
      title: quote.title,
      version: quote.version,
    });
  }, [mutations]);

  return (
    <div className={`${pageShellClass} flex flex-col gap-6`}>
      <header className={pageHeaderWithSubtitleClass}>
        <h1 className={pageTitleClass}>{t('quotes.pageTitle')}</h1>
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

      <QuoteList
        t={t}
        locale={i18n.language}
        quotes={listState.filteredQuotes}
        isLoading={listState.isLoading}
        onOpenQuote={handleOpenQuote}
        onDeleteQuote={handleRequestDelete}
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
        onConfirm={() => void mutations.handleDeleteQuote()}
      />
    </div>
  );
});

QuotesPageComponent.displayName = 'QuotesPage';

/** Quotes route component. */
export const QuotesPage = QuotesPageComponent;
