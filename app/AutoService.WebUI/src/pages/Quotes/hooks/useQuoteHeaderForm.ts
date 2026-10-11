/** Header form of the quote editor: edits in progress on top of the server values, plus the field errors of a failed save attempt. */
import { useCallback, useMemo, useState, type SetStateAction } from 'react';
import type { QuoteDetailDto } from '../../../types/quotes/quotes.types';
import {
  buildDefaultQuoteHeaderForm,
  buildQuoteHeaderForm,
  EMPTY_QUOTE_HEADER_FORM,
  NO_QUOTE_HEADER_FIELD_ERRORS,
  validateQuoteHeaderForm,
  type QuoteHeaderFormState,
} from '../helpers';

/** Form key of a quote that does not exist yet. */
const NEW_QUOTE_FORM_KEY = 'new';

/** Header edits in progress, tied to the server state (the key) they started from, so a newer version drops them. */
interface HeaderDraft {
  readonly key: string;
  readonly form: QuoteHeaderFormState;
}

/** Identifies the server state a header form is built on: the quote to be created, or one quote at one version. */
function toHeaderFormKey(quote: QuoteDetailDto | null): string {
  return quote === null ? NEW_QUOTE_FORM_KEY : `${String(quote.id)}:${String(quote.version)}`;
}

/** The header form to show: the draft of this key, else the saved values of the quote (blank while no quote exists). */
function resolveHeaderForm(draft: HeaderDraft | null, key: string, quote: QuoteDetailDto | null): QuoteHeaderFormState {
  if (draft?.key === key) {
    return draft.form;
  }

  return quote === null ? EMPTY_QUOTE_HEADER_FORM : buildQuoteHeaderForm(quote);
}

/** Holds the header form for the open quote (null while it is being created); a newer server version discards the edits. */
export function useQuoteHeaderForm(quote: QuoteDetailDto | null) {
  const [draft, setDraft] = useState<HeaderDraft | null>(null);
  const [attemptedFormKey, setAttemptedFormKey] = useState<string | null>(null);

  const formKey = toHeaderFormKey(quote);
  const headerForm = useMemo(() => resolveHeaderForm(draft, formKey, quote), [draft, formKey, quote]);
  const headerErrors = attemptedFormKey === formKey ? validateQuoteHeaderForm(headerForm) : NO_QUOTE_HEADER_FIELD_ERRORS;

  const setHeaderForm = useCallback((action: SetStateAction<QuoteHeaderFormState>) => {
    setDraft((previous) => {
      const current = resolveHeaderForm(previous, formKey, quote);
      return { key: formKey, form: typeof action === 'function' ? action(current) : action };
    });
  }, [formKey, quote]);

  const markHeaderSubmitAttempted = useCallback(() => {
    setAttemptedFormKey(formKey);
  }, [formKey]);

  const startNewHeaderForm = useCallback(() => {
    setDraft({ key: NEW_QUOTE_FORM_KEY, form: buildDefaultQuoteHeaderForm() });
    setAttemptedFormKey(null);
  }, []);

  const resetHeaderForm = useCallback(() => {
    setDraft(null);
    setAttemptedFormKey(null);
  }, []);

  return {
    headerForm,
    headerErrors,
    setHeaderForm,
    markHeaderSubmitAttempted,
    startNewHeaderForm,
    resetHeaderForm,
  };
}
