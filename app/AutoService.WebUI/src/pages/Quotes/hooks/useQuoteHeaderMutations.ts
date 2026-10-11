/** Header-level quote writes: creating a draft, saving title and notes, and extending the validity. */
import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { quoteService } from '../../../services/quotes/quote.service';
import type {
  CreateQuoteRequest,
  ExtendQuoteValidityRequest,
  UpdateQuoteRequest,
} from '../../../types/quotes/quotes.types';
import { toValidUntilIso } from '../helpers';
import { buildCreateQuoteRequest, buildUpdateQuoteRequest, QUOTE_WRITE_NETWORK_MODE } from './quoteMutation.helpers';
import { useQuoteCache } from './useQuoteCache';
import type { QuoteEditorState } from './useQuoteEditor';
import type { QuoteWriteOutcome } from './useQuoteWriteOutcome';

/** External dependencies for the header write hook. */
interface UseQuoteHeaderMutationsParams {
  editor: QuoteEditorState;
  outcome: QuoteWriteOutcome;
  showErrorToast: (messageKey: string) => void;
}

/** Wires the header writes to the editor forms; each success lands in the query cache and marks the revenue report stale. */
export function useQuoteHeaderMutations({ editor, outcome, showErrorToast }: UseQuoteHeaderMutationsParams) {
  const { adoptWrite, handleWriteError } = outcome;
  const { invalidateReport } = useQuoteCache();
  const { headerForm, markHeaderSubmitAttempted, quote, vehicleId } = editor;

  const { mutate: createQuote, isPending: isCreatingQuote } = useMutation({
    networkMode: QUOTE_WRITE_NETWORK_MODE,
    mutationFn: (variables: { vehicleId: number; request: CreateQuoteRequest }) =>
      quoteService.createQuote(variables.vehicleId, variables.request),
    onSuccess: (created) => {
      adoptWrite(created, 'quotes.toasts.quoteCreated');
      invalidateReport();
    },
    onError: (error) => handleWriteError(error, 'quotes.errors.saveFailed', null),
  });

  const { mutate: saveHeader, isPending: isSavingHeader } = useMutation({
    networkMode: QUOTE_WRITE_NETWORK_MODE,
    mutationFn: (variables: { quoteId: number; request: UpdateQuoteRequest }) =>
      quoteService.updateQuote(variables.quoteId, variables.request),
    onSuccess: (updated) => {
      adoptWrite(updated, 'quotes.toasts.quoteUpdated');
    },
    onError: (error, variables) => handleWriteError(error, 'quotes.errors.saveFailed', variables.quoteId),
  });

  const { mutate: extendValidity, isPending: isExtendingValidity } = useMutation({
    networkMode: QUOTE_WRITE_NETWORK_MODE,
    mutationFn: (variables: { quoteId: number; request: ExtendQuoteValidityRequest }) =>
      quoteService.extendValidity(variables.quoteId, variables.request),
    onSuccess: (updated) => {
      adoptWrite(updated, 'quotes.toasts.validityExtended');
      invalidateReport();
    },
    onError: (error, variables) => handleWriteError(error, 'quotes.errors.saveFailed', variables.quoteId),
  });

  const handleCreateQuote = useCallback(() => {
    if (vehicleId === null) {
      return;
    }

    const built = buildCreateQuoteRequest(headerForm);

    if (!built.ok) {
      markHeaderSubmitAttempted();
      showErrorToast(built.fieldError);
      return;
    }

    createQuote({ vehicleId, request: built.payload });
  }, [createQuote, headerForm, markHeaderSubmitAttempted, showErrorToast, vehicleId]);

  const handleSaveHeader = useCallback(() => {
    if (quote === null) {
      return;
    }

    const built = buildUpdateQuoteRequest(headerForm, quote.version);

    if (!built.ok) {
      markHeaderSubmitAttempted();
      showErrorToast(built.fieldError);
      return;
    }

    saveHeader({ quoteId: quote.id, request: built.payload });
  }, [headerForm, markHeaderSubmitAttempted, quote, saveHeader, showErrorToast]);

  const handleExtendValidity = useCallback(() => {
    if (quote === null || headerForm.validUntil.length === 0) {
      return;
    }

    extendValidity({
      quoteId: quote.id,
      request: { validUntil: toValidUntilIso(headerForm.validUntil), version: quote.version },
    });
  }, [extendValidity, headerForm.validUntil, quote]);

  return {
    isSavingQuote: isCreatingQuote || isSavingHeader || isExtendingValidity,
    handleCreateQuote,
    handleSaveHeader,
    handleExtendValidity,
  };
}
