/** Outcome of a quote write, shared by every write hook: adopt the returned quote or toast the failure. */
import { useCallback } from 'react';
import { isAxiosError } from 'axios';
import { hasErrorCode, isVersionConflict } from '../../../services/http/error-code';
import {
  extractServerFieldErrors,
  getFirstFieldErrorMessage,
  normalizeServerFieldErrors,
  type ServerErrorBody,
} from '../../../utils/serverValidation';
import type { QuoteDetailDto } from '../../../types/quotes/quotes.types';
import { mapQuoteValidationMessageToKey } from '../helpers';
import { useQuoteCache } from './useQuoteCache';

/** Error-code body the API returns when the submitted version is stale. */
const VERSION_CONFLICT_CODE = 'quote_version_conflict';

/** Error-code bodies the API returns when the quote e-mail failed or the customer has no address. */
const EMAIL_FAILED_CODE = 'quote_email_failed';
const CUSTOMER_EMAIL_MISSING_CODE = 'quote_customer_email_missing';

interface UseQuoteWriteOutcomeParams {
  showSuccessToast: (messageKey: string) => void;
  showErrorToast: (messageKey: string) => void;
  adoptQuote: (quoteId: number) => void;
}

export function useQuoteWriteOutcome({ showSuccessToast, showErrorToast, adoptQuote }: UseQuoteWriteOutcomeParams) {
  const { refreshQuote, storeQuote } = useQuoteCache();

  /** Adopts the quote a write returned; the answer carries the full detail, so no refetch is needed. */
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
    if (!isAxiosError<ServerErrorBody>(error)) {
      showErrorToast(fallbackKey);
      return;
    }

    const responseData = error.response?.data;

    if (isVersionConflict(error, VERSION_CONFLICT_CODE)) {
      showErrorToast('quotes.errors.versionConflict');

      if (quoteId !== null) {
        await refreshOpenQuote(quoteId);
      }

      return;
    }

    if (hasErrorCode(error, 409, EMAIL_FAILED_CODE)) {
      showErrorToast('quotes.errors.emailFailed');
      return;
    }

    if (hasErrorCode(error, 409, CUSTOMER_EMAIL_MISSING_CODE)) {
      showErrorToast('quotes.errors.customerEmailMissing');
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

export type QuoteWriteOutcome = ReturnType<typeof useQuoteWriteOutcome>;
