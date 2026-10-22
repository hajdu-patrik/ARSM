/** Line-level quote writes: adding or editing a line from the inline form, and removing a saved line. */
import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { quoteService } from '../../../services/quotes/quote.service';
import type { QuoteLineDto, QuoteLineRequest } from '../../../types/quotes/quotes.types';
import { buildQuoteLineRequest, QUOTE_WRITE_NETWORK_MODE } from './quoteMutation.helpers';
import type { QuoteEditorState, QuoteLineEditingTarget } from './useQuoteEditor';
import type { QuoteWriteOutcome } from './useQuoteWriteOutcome';

interface SaveLineVariables {
  quoteId: number;
  target: NonNullable<QuoteLineEditingTarget>;
  request: QuoteLineRequest;
}

interface DeleteLineVariables {
  quoteId: number;
  lineId: number;
  version: number;
}

interface UseQuoteLineMutationsParams {
  editor: QuoteEditorState;
  outcome: QuoteWriteOutcome;
  showErrorToast: (messageKey: string) => void;
}

/** Wires the line writes to the inline line form; a draft-only operation, so the revenue report is untouched. */
export function useQuoteLineMutations({ editor, outcome, showErrorToast }: UseQuoteLineMutationsParams) {
  const { adoptWrite, handleWriteError } = outcome;
  const { cancelLineEditing, lineEditingTarget, lineForm, quote } = editor;

  const { mutate: saveLine, isPending: isSavingLineWrite } = useMutation({
    networkMode: QUOTE_WRITE_NETWORK_MODE,
    mutationFn: (variables: SaveLineVariables) => (
      variables.target.kind === 'new'
        ? quoteService.addLine(variables.quoteId, variables.request)
        : quoteService.updateLine(variables.quoteId, variables.target.lineId, variables.request)
    ),
    onSuccess: (updated, variables) => {
      cancelLineEditing();
      adoptWrite(updated, variables.target.kind === 'new' ? 'quotes.toasts.lineAdded' : 'quotes.toasts.lineUpdated');
    },
    onError: (error, variables) => handleWriteError(error, 'quotes.errors.lineSaveFailed', variables.quoteId),
  });

  const { mutate: deleteLine, isPending: isDeletingLine } = useMutation({
    networkMode: QUOTE_WRITE_NETWORK_MODE,
    mutationFn: (variables: DeleteLineVariables) =>
      quoteService.deleteLine(variables.quoteId, variables.lineId, variables.version),
    onSuccess: (updated) => {
      cancelLineEditing();
      adoptWrite(updated, 'quotes.toasts.lineDeleted');
    },
    onError: (error, variables) => handleWriteError(error, 'quotes.errors.lineDeleteFailed', variables.quoteId),
  });

  const handleSubmitLine = useCallback(() => {
    if (quote === null || lineEditingTarget === null) {
      return;
    }

    const built = buildQuoteLineRequest(lineForm, quote.version);

    if (!built.ok) {
      showErrorToast(built.fieldError);
      return;
    }

    saveLine({ quoteId: quote.id, target: lineEditingTarget, request: built.payload });
  }, [lineEditingTarget, lineForm, quote, saveLine, showErrorToast]);

  const handleDeleteLine = useCallback((line: QuoteLineDto) => {
    if (quote === null) {
      return;
    }

    deleteLine({ quoteId: quote.id, lineId: line.id, version: quote.version });
  }, [deleteLine, quote]);

  return {
    isSavingLine: isSavingLineWrite || isDeletingLine,
    handleSubmitLine,
    handleDeleteLine,
  };
}
