/**
 * Quote editor state hook.
 *
 * Owns what the editor modal is currently showing: which quote (or which
 * vehicle, for a new draft), the loaded detail, the header form, and the
 * line form with the row currently being edited. Server calls that change a
 * quote live in `useQuoteMutations`; this hook only reads and holds state.
 * @module pages/Quotes/hooks/useQuoteEditor
 */
import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';
import type { VehicleDetailDto } from '../../../types/customers/customers.types';
import type { QuoteDetailDto, QuoteLineDto } from '../../../types/quotes/quotes.types';
import { quoteService } from '../../../services/quotes/quote.service';
import { customerRegistryService } from '../../../services/customers/customer-registry.service';
import {
  buildDefaultQuoteHeaderForm,
  buildQuoteHeaderForm,
  buildQuoteLineForm,
  EMPTY_QUOTE_LINE_FORM,
  type QuoteEditorMode,
  type QuoteHeaderFormState,
  type QuoteLineFormState,
} from '../helpers';

/** Which line row the editor is currently editing: a new one, an existing one, or none. */
export type QuoteLineEditingTarget = { kind: 'new' } | { kind: 'existing'; lineId: number } | null;

/** External dependencies for the quote editor hook. */
interface UseQuoteEditorParams {
  showErrorToast: (key: string) => void;
}

/**
 * Manages quote editor modal state, detail loading, and the two forms.
 * @param params Localized error toast handler.
 * @returns Editor state and the actions that open, close, and retarget it.
 */
export function useQuoteEditor({ showErrorToast }: UseQuoteEditorParams) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<QuoteEditorMode>('create');
  const [vehicleId, setVehicleId] = useState<number | null>(null);
  const [vehicle, setVehicle] = useState<VehicleDetailDto | null>(null);
  const [quote, setQuote] = useState<QuoteDetailDto | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [headerForm, setHeaderForm] = useState<QuoteHeaderFormState>(buildDefaultQuoteHeaderForm);
  const [lineForm, setLineForm] = useState<QuoteLineFormState>(EMPTY_QUOTE_LINE_FORM);
  const [lineEditingTarget, setLineEditingTarget] = useState<QuoteLineEditingTarget>(null);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuote(null);
    setVehicle(null);
    setVehicleId(null);
    setLineEditingTarget(null);
  }, []);

  const openCreate = useCallback(async (targetVehicleId: number) => {
    setMode('create');
    setQuote(null);
    setVehicle(null);
    setVehicleId(targetVehicleId);
    setHeaderForm(buildDefaultQuoteHeaderForm());
    setLineForm(EMPTY_QUOTE_LINE_FORM);
    setLineEditingTarget(null);
    setIsOpen(true);

    try {
      setVehicle(await customerRegistryService.getVehicle(targetVehicleId));
    } catch {
      // The anchor is the id, not the label: a failed vehicle lookup only
      // costs the plate in the title, so the draft can still be written.
      showErrorToast('quotes.errors.loadVehicleFailed');
    }
  }, [showErrorToast]);

  const openQuote = useCallback(async (quoteId: number) => {
    setMode('edit');
    setQuote(null);
    setVehicle(null);
    setLineForm(EMPTY_QUOTE_LINE_FORM);
    setLineEditingTarget(null);
    setIsLoadingQuote(true);
    setIsOpen(true);

    try {
      const detail = await quoteService.getQuote(quoteId);
      setQuote(detail);
      setVehicleId(detail.vehicleId);
      setHeaderForm(buildQuoteHeaderForm(detail));
    } catch {
      showErrorToast('quotes.errors.loadQuoteFailed');
      setIsOpen(false);
    } finally {
      setIsLoadingQuote(false);
    }
  }, [showErrorToast]);

  /**
   * Adopts the quote a mutation returned. Every write endpoint answers with
   * the full detail, including the new version, so the editor never has to
   * refetch to stay writable.
   */
  const applyQuote = useCallback((detail: QuoteDetailDto) => {
    setMode('edit');
    setQuote(detail);
    setVehicleId(detail.vehicleId);
    setHeaderForm(buildQuoteHeaderForm(detail));
  }, []);

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

  return {
    isOpen,
    mode,
    vehicleId,
    vehicle,
    quote,
    isLoadingQuote,
    headerForm,
    setHeaderForm: setHeaderForm as Dispatch<SetStateAction<QuoteHeaderFormState>>,
    lineForm,
    setLineForm: setLineForm as Dispatch<SetStateAction<QuoteLineFormState>>,
    lineEditingTarget,
    openCreate,
    openQuote,
    close,
    applyQuote,
    startAddLine,
    startEditLine,
    cancelLineEditing,
  };
}

/** Quote editor state and actions returned by {@link useQuoteEditor}. */
export type QuoteEditorState = ReturnType<typeof useQuoteEditor>;
