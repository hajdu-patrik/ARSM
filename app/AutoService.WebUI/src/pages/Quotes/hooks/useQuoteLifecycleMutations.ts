/** Quote lifecycle writes: status transitions and deletion, plus the delete confirmation target. */
import { useCallback, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { quoteService } from '../../../services/quotes/quote.service';
import type { ChangeQuoteStatusRequest, QuoteStatus } from '../../../types/quotes/quotes.types';
import { QUOTE_WRITE_NETWORK_MODE } from './quoteMutation.helpers';
import { useQuoteCache } from './useQuoteCache';
import type { QuoteEditorState } from './useQuoteEditor';
import type { QuoteWriteOutcome } from './useQuoteWriteOutcome';

/** Success toast key per status transition. */
const STATUS_TOAST_KEYS: Record<QuoteStatus, string> = {
  Draft: 'quotes.toasts.quoteUpdated',
  Sent: 'quotes.toasts.quoteSent',
  Accepted: 'quotes.toasts.quoteAccepted',
  Rejected: 'quotes.toasts.quoteRejected',
};

/** Minimal delete-confirmation target, usable from both a list row and the open editor. */
export interface DeleteQuoteTarget {
  id: number;
  quoteNumber: string;
  title: string;
  version: number;
}

/** Variables of a status change. */
interface ChangeStatusVariables {
  quoteId: number;
  request: ChangeQuoteStatusRequest;
}

/** External dependencies for the lifecycle write hook. */
interface UseQuoteLifecycleMutationsParams {
  editor: QuoteEditorState;
  outcome: QuoteWriteOutcome;
  showSuccessToast: (messageKey: string) => void;
}

/** Wires status changes and deletion to the editor and the delete modal; both change the revenue report, so each marks it stale. */
export function useQuoteLifecycleMutations({ editor, outcome, showSuccessToast }: UseQuoteLifecycleMutationsParams) {
  const { adoptWrite, handleWriteError } = outcome;
  const { invalidateReport, removeQuote } = useQuoteCache();
  const { close: closeEditor, quote } = editor;
  const [deleteTarget, setDeleteTarget] = useState<DeleteQuoteTarget | null>(null);

  const { mutate: changeStatus, isPending: isChangingStatus } = useMutation({
    networkMode: QUOTE_WRITE_NETWORK_MODE,
    mutationFn: (variables: ChangeStatusVariables) => quoteService.changeStatus(variables.quoteId, variables.request),
    onSuccess: (updated, variables) => {
      adoptWrite(updated, STATUS_TOAST_KEYS[variables.request.status]);
      invalidateReport();
    },
    onError: (error, variables) => handleWriteError(error, 'quotes.errors.statusChangeFailed', variables.quoteId),
  });

  const { mutate: deleteQuote, isPending: isDeletingQuote } = useMutation({
    networkMode: QUOTE_WRITE_NETWORK_MODE,
    mutationFn: (target: DeleteQuoteTarget) => quoteService.deleteQuote(target.id, target.version),
    onSuccess: (_result, target) => {
      setDeleteTarget(null);

      if (quote?.id === target.id) {
        closeEditor();
      }

      removeQuote(target.id);
      showSuccessToast('quotes.toasts.quoteDeleted');
      invalidateReport();
    },
    onError: (error, target) => handleWriteError(error, 'quotes.errors.deleteFailed', target.id),
  });

  const handleChangeStatus = useCallback((status: QuoteStatus) => {
    if (quote === null) {
      return;
    }

    changeStatus({ quoteId: quote.id, request: { status, version: quote.version } });
  }, [changeStatus, quote]);

  /** Opens the delete confirmation for a list row or the open quote, keeping only the target fields. */
  const openDeleteModal = useCallback((quote: DeleteQuoteTarget) => {
    setDeleteTarget({ id: quote.id, quoteNumber: quote.quoteNumber, title: quote.title, version: quote.version });
  }, []);

  const closeDeleteModal = useCallback(() => {
    if (isDeletingQuote) {
      return;
    }

    setDeleteTarget(null);
  }, [isDeletingQuote]);

  const handleDeleteQuote = useCallback(() => {
    if (deleteTarget === null) {
      return;
    }

    deleteQuote(deleteTarget);
  }, [deleteQuote, deleteTarget]);

  return {
    isChangingStatus,
    isDeletingQuote,
    deleteTarget,
    handleChangeStatus,
    openDeleteModal,
    closeDeleteModal,
    handleDeleteQuote,
  };
}
