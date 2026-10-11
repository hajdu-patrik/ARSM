/** Line form of the quote editor: the values being typed and which line row (new or saved) they belong to. */
import { useCallback, useState } from 'react';
import type { QuoteLineDto } from '../../../types/quotes/quotes.types';
import { buildQuoteLineForm, EMPTY_QUOTE_LINE_FORM, type QuoteLineFormState } from '../helpers';

/** Which line row the editor is currently editing: a new one, an existing one, or none. */
export type QuoteLineEditingTarget = { kind: 'new' } | { kind: 'existing'; lineId: number } | null;

/** Holds the line form and its editing target; cancelling also resets the form. */
export function useQuoteLineForm() {
  const [lineForm, setLineForm] = useState<QuoteLineFormState>(EMPTY_QUOTE_LINE_FORM);
  const [lineEditingTarget, setLineEditingTarget] = useState<QuoteLineEditingTarget>(null);

  const startAddLine = useCallback(() => {
    setLineForm(EMPTY_QUOTE_LINE_FORM);
    setLineEditingTarget({ kind: 'new' });
  }, []);

  const startEditLine = useCallback((line: QuoteLineDto) => {
    setLineForm(buildQuoteLineForm(line));
    setLineEditingTarget({ kind: 'existing', lineId: line.id });
  }, []);

  const cancelLineEditing = useCallback(() => {
    setLineForm(EMPTY_QUOTE_LINE_FORM);
    setLineEditingTarget(null);
  }, []);

  return { lineForm, setLineForm, lineEditingTarget, startAddLine, startEditLine, cancelLineEditing };
}
