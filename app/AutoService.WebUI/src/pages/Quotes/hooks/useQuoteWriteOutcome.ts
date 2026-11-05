/** Outcome of a quote write, shared by every write hook: adopt the returned quote or toast the failure. */
import { useCallback } from 'react';
import { isAxiosError } from 'axios';
import { hasErrorCode, isVersionConflict, readErrorCode } from '../../../services/http/error-code';
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

/** Error-code bodies the API returns when the linked appointment locks the quote, with their toast keys. */
const LOCK_ERROR_TOAST_KEYS: Record<string, string> = {
  quote_locked_appointment_completed: 'quotes.errors.lockedAppointmentCompleted',
  quote_locked_appointment_cancelled: 'quotes.errors.lockedAppointmentCancelled',
  quote_locked_appointment_accepted: 'quotes.errors.lockedAppointmentAccepted',
};

/** Error-code body the API returns (409) when the quote e-mail could not be delivered. */
const EMAIL_FAILED_CODE = 'quote_email_failed';

/** Error-code body the API returns (422) when a draft's validity date has already passed. */
const VALID_UNTIL_PASSED_CODE = 'quote_valid_until_passed';

/** Error-code body the API returns (422) when the customer's e-mail address is empty or a `.local` one. */
export const CUSTOMER_EMAIL_MISSING_CODE = 'quote_customer_email_missing';

/** The lock toast key of a 409 lock answer, or undefined for any other error. */
function resolveLockToastKey(error: unknown): string | undefined {
  const code = readErrorCode(error);

  if (code === undefined || !hasErrorCode(error, 409, code)) {
    return undefined;
  }

  return LOCK_ERROR_TOAST_KEYS[code];
}

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

  /** Maps a failed write to one toast; a version conflict or an appointment lock also reloads the quote the write targeted. */
  const handleWriteError = useCallback(async (error: unknown, fallbackKey: string, quoteId: number | null) => {
    if (!isAxiosError<ServerErrorBody>(error)) {
      showErrorToast(fallbackKey);
      return;
    }

    const responseData = error.response?.data;

    const reloadToastKey = isVersionConflict(error, VERSION_CONFLICT_CODE)
      ? 'quotes.errors.versionConflict'
      : resolveLockToastKey(error);

    if (reloadToastKey) {
      showErrorToast(reloadToastKey);

      if (quoteId !== null) {
        await refreshOpenQuote(quoteId);
      }

      return;
    }

    if (hasErrorCode(error, 409, EMAIL_FAILED_CODE)) {
      showErrorToast('quotes.errors.emailFailed');
      return;
    }

    if (hasErrorCode(error, 422, VALID_UNTIL_PASSED_CODE)) {
      showErrorToast('quotes.errors.validUntilInPast');
      return;
    }

    // Reached only by the send after the e-mail dialog, when the typed address is unusable too (for example `.local`).
    if (hasErrorCode(error, 422, CUSTOMER_EMAIL_MISSING_CODE)) {
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
