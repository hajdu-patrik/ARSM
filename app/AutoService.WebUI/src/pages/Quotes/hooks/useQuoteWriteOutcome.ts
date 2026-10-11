/** Outcome of a quote write, shared by every write hook: adopting the quote the server returned, or mapping the failure (a stale version included) to one toast. */
import { useCallback } from 'react';
import { isAxiosError } from 'axios';
import {
  extractServerFieldErrors,
  getFirstFieldErrorMessage,
  normalizeServerFieldErrors,
  type ServerFieldErrors,
} from '../../../utils/serverValidation';
import type { QuoteDetailDto } from '../../../types/quotes/quotes.types';
import { mapQuoteValidationMessageToKey } from '../helpers';
import { useQuoteCache } from './useQuoteCache';

/** Error-code body the API returns when the submitted version is stale. */
const VERSION_CONFLICT_CODE = 'quote_version_conflict';

/** External dependencies for the write-outcome hook. */
interface UseQuoteWriteOutcomeParams {
  showSuccessToast: (messageKey: string) => void;
  showErrorToast: (messageKey: string) => void;
  adoptQuote: (quoteId: number) => void;
}

/** Builds the success and failure handlers the quote writes call from their mutation callbacks. */
export function useQuoteWriteOutcome({ showSuccessToast, showErrorToast, adoptQuote }: UseQuoteWriteOutcomeParams) {
  const { refreshQuote, storeQuote } = useQuoteCache();

  /** Adopts the quote a write returned; every write endpoint answers with the full detail (incl. version), so no refetch is needed. */
  const adoptWrite = useCallback((detail: QuoteDetailDto, successKey: string) => {
    storeQuote(detail);
    adoptQuote(detail.id);
    showSuccessToast(successKey);
  }, [adoptQuote, showSuccessToast, storeQuote]);

  /** Reloads the quote after a stale-version conflict, so the next attempt carries the current server version. */
  const refreshOpenQuote = useCallback(async (quoteId: number) => {
    try {
      await refreshQuote(quoteId);
    } catch {
      showErrorToast('quotes.errors.loadQuoteFailed');
    }
  }, [refreshQuote, showErrorToast]);

  /** Maps a failed write to one toast; a version conflict also reloads the quote the write targeted. */
  const handleWriteError = useCallback(async (error: unknown, fallbackKey: string, quoteId: number | null) => {
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

  return { adoptWrite, handleWriteError };
}

/** Success and failure handlers returned by {@link useQuoteWriteOutcome}. */
export type QuoteWriteOutcome = ReturnType<typeof useQuoteWriteOutcome>;
