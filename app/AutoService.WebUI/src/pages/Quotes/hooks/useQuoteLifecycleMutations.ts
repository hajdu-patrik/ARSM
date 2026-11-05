/** Quote lifecycle writes: status transitions and deletion, plus the delete confirmation target. */
import { useCallback, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { hasErrorCode } from '../../../services/http/error-code';
import { quoteService } from '../../../services/quotes/quote.service';
import type { ChangeQuoteStatusRequest, QuoteStatus } from '../../../types/quotes/quotes.types';
import { QUOTE_WRITE_NETWORK_MODE } from './quoteMutation.helpers';
import { useQuoteCache } from './useQuoteCache';
import { useQuoteCustomerEmail } from './useQuoteCustomerEmail';
import type { QuoteEditorState } from './useQuoteEditor';
import { CUSTOMER_EMAIL_MISSING_CODE, type QuoteWriteOutcome } from './useQuoteWriteOutcome';

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

interface ChangeStatusVariables {
  quoteId: number;
  vehicleId: number;
  request: ChangeQuoteStatusRequest;
  /** True for the send that follows the saved customer address, so a refusal is toasted instead of reopening the dialog. */
  isAfterCustomerEmail?: boolean;
}

interface UseQuoteLifecycleMutationsParams {
  editor: QuoteEditorState;
  outcome: QuoteWriteOutcome;
  showSuccessToast: (messageKey: string) => void;
  showErrorToast: (messageKey: string) => void;
}

/** Wires status changes and deletion to the editor and the delete modal; both change the revenue report, so each marks it stale. */
export function useQuoteLifecycleMutations({ editor, outcome, showSuccessToast, showErrorToast }: UseQuoteLifecycleMutationsParams) {
  const { adoptWrite, handleWriteError } = outcome;
  const { invalidateReport, invalidateScheduler, removeQuote } = useQuoteCache();
  const {
    confirmCustomerEmail,
    openCustomerEmailDialog,
    ...customerEmailDialog
  } = useQuoteCustomerEmail({ showErrorToast });
  const { close: closeEditor, quote } = editor;
  const [deleteTarget, setDeleteTarget] = useState<DeleteQuoteTarget | null>(null);

  const { mutate: changeStatus, isPending: isChangingStatus } = useMutation({
    networkMode: QUOTE_WRITE_NETWORK_MODE,
    mutationFn: (variables: ChangeStatusVariables) => quoteService.changeStatus(variables.quoteId, variables.request),
    onSuccess: (updated, variables) => {
      adoptWrite(updated, STATUS_TOAST_KEYS[variables.request.status]);
      invalidateReport();
      invalidateScheduler();
    },
    onError: async (error, variables) => {
      // A missing or unusable customer address is fixed in the dialog, not toasted.
      if (!variables.isAfterCustomerEmail && hasErrorCode(error, 422, CUSTOMER_EMAIL_MISSING_CODE)) {
        openCustomerEmailDialog({
          quoteId: variables.quoteId,
          vehicleId: variables.vehicleId,
          version: variables.request.version,
        });
        return;
      }

      await handleWriteError(error, 'quotes.errors.statusChangeFailed', variables.quoteId);
    },
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

    changeStatus({ quoteId: quote.id, vehicleId: quote.vehicleId, request: { status, version: quote.version } });
  }, [changeStatus, quote]);

  /** Saves the typed customer address, then sends the quote again with the version the refused send carried. */
  const handleConfirmCustomerEmail = useCallback(() => {
    confirmCustomerEmail((saved) => {
      changeStatus({
        quoteId: saved.quoteId,
        vehicleId: saved.vehicleId,
        request: { status: 'Sent', version: saved.version },
        isAfterCustomerEmail: true,
      });
    });
  }, [changeStatus, confirmCustomerEmail]);

  /** Opens the delete confirmation for a list row or the open quote, keeping only the target fields. */
  const openDeleteModal = useCallback((target: DeleteQuoteTarget) => {
    setDeleteTarget({ id: target.id, quoteNumber: target.quoteNumber, title: target.title, version: target.version });
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
    ...customerEmailDialog,
    handleConfirmCustomerEmail,
    isChangingStatus,
    isDeletingQuote,
    deleteTarget,
    handleChangeStatus,
    openDeleteModal,
    closeDeleteModal,
    handleDeleteQuote,
  };
}
