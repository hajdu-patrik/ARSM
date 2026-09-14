/**
 * Quote mutation hook.
 *
 * Every write goes through here: draft creation, header edit, line add/edit/
 * remove, status change, validity extension, and deletion. Each server call
 * answers with the full quote, so the editor adopts the response instead of
 * refetching, and the list is reloaded whenever a row could have changed.
 * @module pages/Quotes/hooks/useQuoteMutations
 */
import { useCallback, useState } from 'react';
import { isAxiosError } from 'axios';
import {
  extractServerFieldErrors,
  getFirstFieldErrorMessage,
  normalizeServerFieldErrors,
  type ServerFieldErrors,
} from '../../../utils/serverValidation';
import type { QuoteDetailDto, QuoteLineDto, QuoteStatus } from '../../../types/quotes/quotes.types';
import { quoteService } from '../../../services/quotes/quote.service';
import { mapQuoteValidationMessageToKey, toValidUntilIso } from '../helpers';
import type { QuoteEditorState } from './useQuoteEditor';
import {
  buildCreateQuoteRequest,
  buildQuoteLineRequest,
  buildUpdateQuoteRequest,
} from './quoteMutation.helpers';

/** Error-code body the API returns when the submitted version is stale. */
const VERSION_CONFLICT_CODE = 'quote_version_conflict';

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

/** External dependencies required by the quote mutation handlers. */
interface UseQuoteMutationsParams {
  showSuccessToast: (messageKey: string) => void;
  showErrorToast: (messageKey: string) => void;
  editor: QuoteEditorState;
  reloadQuotes: (force?: boolean) => Promise<void>;
}

/**
 * Wires the quote write operations to the editor state and the list reload.
 * @param params Toast handlers, the editor state, and the list reloader.
 * @returns Mutation actions, busy flags, and delete-confirmation state.
 */
export function useQuoteMutations({
  showSuccessToast,
  showErrorToast,
  editor,
  reloadQuotes,
}: UseQuoteMutationsParams) {
  const [isSavingQuote, setIsSavingQuote] = useState(false);
  const [isSavingLine, setIsSavingLine] = useState(false);
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [isDeletingQuote, setIsDeletingQuote] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteQuoteTarget | null>(null);

  const { applyQuote, cancelLineEditing, close: closeEditor } = editor;

  /**
   * Reloads the open quote after a stale-version conflict, so the next
   * attempt carries the version the server actually holds.
   */
  const refreshOpenQuote = useCallback(async (quoteId: number) => {
    try {
      applyQuote(await quoteService.getQuote(quoteId));
    } catch {
      showErrorToast('quotes.errors.loadQuoteFailed');
    }
  }, [applyQuote, showErrorToast]);

  const handleMutationError = useCallback(async (error: unknown, fallbackKey: string, quoteId: number | null) => {
    if (!isAxiosError<{ code?: string; detail?: string; errors?: ServerFieldErrors }>(error)) {
      showErrorToast(fallbackKey);
      return;
    }

    const responseData = error.response?.data;

    if (error.response?.status === 409 && responseData?.code === VERSION_CONFLICT_CODE) {
      showErrorToast('quotes.errors.versionConflict');

      if (quoteId !== null) {
        await refreshOpenQuote(quoteId);
      }

      return;
    }

    const mappedFieldErrors = normalizeServerFieldErrors(
      extractServerFieldErrors(responseData),
      mapQuoteValidationMessageToKey,
    );
    const firstFieldError = getFirstFieldErrorMessage(mappedFieldErrors);

    if (firstFieldError) {
      showErrorToast(firstFieldError);
      return;
    }

    showErrorToast(responseData?.detail ? mapQuoteValidationMessageToKey(responseData.detail) : fallbackKey);
  }, [refreshOpenQuote, showErrorToast]);

  /** Applies a mutation response to the editor and refreshes the list rows. */
  const adoptMutationResult = useCallback(async (detail: QuoteDetailDto, successKey: string) => {
    applyQuote(detail);
    showSuccessToast(successKey);
    await reloadQuotes(true);
  }, [applyQuote, reloadQuotes, showSuccessToast]);

  const handleCreateQuote = useCallback(async () => {
    if (editor.vehicleId === null) {
      return;
    }

    const { payload, fieldError } = buildCreateQuoteRequest(editor.headerForm);

    if (fieldError) {
      showErrorToast(fieldError);
      return;
    }

    setIsSavingQuote(true);

    try {
      const created = await quoteService.createQuote(editor.vehicleId, payload);
      await adoptMutationResult(created, 'quotes.toasts.quoteCreated');
    } catch (error) {
      await handleMutationError(error, 'quotes.errors.saveFailed', null);
    } finally {
      setIsSavingQuote(false);
    }
  }, [adoptMutationResult, editor.headerForm, editor.vehicleId, handleMutationError, showErrorToast]);

  const handleSaveHeader = useCallback(async () => {
    const openQuote = editor.quote;

    if (!openQuote) {
      return;
    }

    const { payload, fieldError } = buildUpdateQuoteRequest(editor.headerForm, openQuote.version);

    if (fieldError) {
      showErrorToast(fieldError);
      return;
    }

    setIsSavingQuote(true);

    try {
      const updated = await quoteService.updateQuote(openQuote.id, payload);
      await adoptMutationResult(updated, 'quotes.toasts.quoteUpdated');
    } catch (error) {
      await handleMutationError(error, 'quotes.errors.saveFailed', openQuote.id);
    } finally {
      setIsSavingQuote(false);
    }
  }, [adoptMutationResult, editor.headerForm, editor.quote, handleMutationError, showErrorToast]);

  const handleExtendValidity = useCallback(async () => {
    const openQuote = editor.quote;

    if (!openQuote || editor.headerForm.validUntil.length === 0) {
      return;
    }

    setIsSavingQuote(true);

    try {
      const updated = await quoteService.extendValidity(openQuote.id, {
        validUntil: toValidUntilIso(editor.headerForm.validUntil),
        version: openQuote.version,
      });
      await adoptMutationResult(updated, 'quotes.toasts.validityExtended');
    } catch (error) {
      await handleMutationError(error, 'quotes.errors.saveFailed', openQuote.id);
    } finally {
      setIsSavingQuote(false);
    }
  }, [adoptMutationResult, editor.headerForm.validUntil, editor.quote, handleMutationError]);

  const handleSubmitLine = useCallback(async () => {
    const openQuote = editor.quote;
    const target = editor.lineEditingTarget;

    if (!openQuote || !target) {
      return;
    }

    const { payload, fieldError } = buildQuoteLineRequest(editor.lineForm, openQuote.version);

    if (fieldError) {
      showErrorToast(fieldError);
      return;
    }

    setIsSavingLine(true);

    try {
      const updated = target.kind === 'new'
        ? await quoteService.addLine(openQuote.id, payload)
        : await quoteService.updateLine(openQuote.id, target.lineId, payload);

      cancelLineEditing();
      await adoptMutationResult(
        updated,
        target.kind === 'new' ? 'quotes.toasts.lineAdded' : 'quotes.toasts.lineUpdated',
      );
    } catch (error) {
      await handleMutationError(error, 'quotes.errors.lineSaveFailed', openQuote.id);
    } finally {
      setIsSavingLine(false);
    }
  }, [
    adoptMutationResult,
    cancelLineEditing,
    editor.lineEditingTarget,
    editor.lineForm,
    editor.quote,
    handleMutationError,
    showErrorToast,
  ]);

  const handleDeleteLine = useCallback(async (line: QuoteLineDto) => {
    const openQuote = editor.quote;

    if (!openQuote) {
      return;
    }

    setIsSavingLine(true);

    try {
      const updated = await quoteService.deleteLine(openQuote.id, line.id, openQuote.version);
      cancelLineEditing();
      await adoptMutationResult(updated, 'quotes.toasts.lineDeleted');
    } catch (error) {
      await handleMutationError(error, 'quotes.errors.lineDeleteFailed', openQuote.id);
    } finally {
      setIsSavingLine(false);
    }
  }, [adoptMutationResult, cancelLineEditing, editor.quote, handleMutationError]);

  const handleChangeStatus = useCallback(async (status: QuoteStatus) => {
    const openQuote = editor.quote;

    if (!openQuote) {
      return;
    }

    setIsChangingStatus(true);

    try {
      const updated = await quoteService.changeStatus(openQuote.id, { status, version: openQuote.version });
      await adoptMutationResult(updated, STATUS_TOAST_KEYS[status]);
    } catch (error) {
      await handleMutationError(error, 'quotes.errors.statusChangeFailed', openQuote.id);
    } finally {
      setIsChangingStatus(false);
    }
  }, [adoptMutationResult, editor.quote, handleMutationError]);

  const openDeleteModal = useCallback((target: DeleteQuoteTarget) => setDeleteTarget(target), []);

  const closeDeleteModal = useCallback(() => {
    if (isDeletingQuote) {
      return;
    }

    setDeleteTarget(null);
  }, [isDeletingQuote]);

  const handleDeleteQuote = useCallback(async () => {
    if (!deleteTarget) {
      return;
    }

    setIsDeletingQuote(true);

    try {
      await quoteService.deleteQuote(deleteTarget.id, deleteTarget.version);
      setDeleteTarget(null);

      if (editor.quote?.id === deleteTarget.id) {
        closeEditor();
      }

      showSuccessToast('quotes.toasts.quoteDeleted');
      await reloadQuotes(true);
    } catch (error) {
      await handleMutationError(error, 'quotes.errors.deleteFailed', deleteTarget.id);
    } finally {
      setIsDeletingQuote(false);
    }
  }, [closeEditor, deleteTarget, editor.quote, handleMutationError, reloadQuotes, showSuccessToast]);

  return {
    isSavingQuote,
    isSavingLine,
    isChangingStatus,
    isDeletingQuote,
    deleteTarget,
    handleCreateQuote,
    handleSaveHeader,
    handleExtendValidity,
    handleSubmitLine,
    handleDeleteLine,
    handleChangeStatus,
    openDeleteModal,
    closeDeleteModal,
    handleDeleteQuote,
  };
}

/** Quote mutation actions returned by {@link useQuoteMutations}. */
export type QuoteMutationsState = ReturnType<typeof useQuoteMutations>;
