/** Quote writes of the editor and the list, composed from one hook per concern; every write lands in the query cache, not in local copies. */
import type { QuoteEditorState } from './useQuoteEditor';
import { useQuoteHeaderMutations } from './useQuoteHeaderMutations';
import { useQuoteLifecycleMutations } from './useQuoteLifecycleMutations';
import { useQuoteLineMutations } from './useQuoteLineMutations';
import { useQuotePdfDownload } from './useQuotePdfDownload';
import { useQuoteWriteOutcome } from './useQuoteWriteOutcome';

interface UseQuoteMutationsParams {
  showSuccessToast: (messageKey: string) => void;
  showErrorToast: (messageKey: string) => void;
  editor: QuoteEditorState;
}

export function useQuoteMutations({ showSuccessToast, showErrorToast, editor }: UseQuoteMutationsParams) {
  const outcome = useQuoteWriteOutcome({ showSuccessToast, showErrorToast, adoptQuote: editor.adoptQuote });
  const header = useQuoteHeaderMutations({ editor, outcome, showErrorToast });
  const lines = useQuoteLineMutations({ editor, outcome, showErrorToast });
  const lifecycle = useQuoteLifecycleMutations({ editor, outcome, showSuccessToast });
  const pdf = useQuotePdfDownload({ showErrorToast });

  return { ...header, ...lines, ...lifecycle, ...pdf };
}

export type QuoteMutationsState = ReturnType<typeof useQuoteMutations>;
