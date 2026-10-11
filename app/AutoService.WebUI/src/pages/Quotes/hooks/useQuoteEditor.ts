/** Quote editor state hook: which quote or vehicle is open and what is read for it (detail, vehicle); the forms live in their own hooks, the writes in useQuoteMutations. */
import { useCallback, useEffect, useEffectEvent, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useReadFailureToast } from '../../../hooks/useReadFailureToast';
import { customersQueries } from '../../../services/queries/customers.queries';
import { quotesQueries } from '../../../services/queries/quotes.queries';
import { useAuthQueryScope } from '../../../services/queries/useAuthQueryScope';
import { IDLE_QUERY_ENTITY_ID, type QuoteEditorMode } from '../helpers';
import { useQuoteHeaderForm } from './useQuoteHeaderForm';
import { useQuoteLineForm } from './useQuoteLineForm';

export type { QuoteLineEditingTarget } from './useQuoteLineForm';

/** External dependencies for the quote editor hook. */
interface UseQuoteEditorParams {
  showErrorToast: (key: string) => void;
}

/** Calls `close` whenever `hasFailed` turns true; the callback may change on every render without re-running the effect. */
function useCloseOnFailure(hasFailed: boolean, close: () => void): void {
  const handleFailure = useEffectEvent(close);

  useEffect(() => {
    if (hasFailed) {
      handleFailure();
    }
  }, [hasFailed]);
}

/** Manages the quote editor: what is open, the reads behind it, and the header and line forms. */
export function useQuoteEditor({ showErrorToast }: UseQuoteEditorParams) {
  const scope = useAuthQueryScope();
  const [isOpen, setIsOpen] = useState(false);
  const [quoteId, setQuoteId] = useState<number | null>(null);
  const [createVehicleId, setCreateVehicleId] = useState<number | null>(null);

  const quoteQuery = useQuery({
    ...quotesQueries.detail(scope, quoteId ?? IDLE_QUERY_ENTITY_ID),
    enabled: quoteId !== null,
  });
  // Only the create form reads the vehicle; an existing quote carries its own vehicle summary.
  const vehicleQuery = useQuery({
    ...customersQueries.vehicle(scope, createVehicleId ?? IDLE_QUERY_ENTITY_ID),
    enabled: quoteId === null && createVehicleId !== null,
  });

  const quote = quoteId === null ? null : (quoteQuery.data ?? null);
  const vehicle = createVehicleId === null ? null : (vehicleQuery.data ?? null);
  const vehicleId = quote?.vehicleId ?? createVehicleId;
  const mode: QuoteEditorMode = quoteId === null ? 'create' : 'edit';
  const isLoadingQuote = quoteId !== null && quote === null;

  const header = useQuoteHeaderForm(quote);
  const lines = useQuoteLineForm();
  const { resetHeaderForm, startNewHeaderForm } = header;
  const { cancelLineEditing } = lines;

  const close = useCallback(() => {
    setIsOpen(false);
    setQuoteId(null);
    setCreateVehicleId(null);
    resetHeaderForm();
    cancelLineEditing();
  }, [cancelLineEditing, resetHeaderForm]);

  const openCreate = useCallback((targetVehicleId: number) => {
    cancelLineEditing();
    startNewHeaderForm();
    setQuoteId(null);
    setCreateVehicleId(targetVehicleId);
    setIsOpen(true);
  }, [cancelLineEditing, startNewHeaderForm]);

  const openQuote = useCallback((targetQuoteId: number) => {
    cancelLineEditing();
    resetHeaderForm();
    setQuoteId(targetQuoteId);
    setCreateVehicleId(null);
    setIsOpen(true);
  }, [cancelLineEditing, resetHeaderForm]);

  /** Points the editor at the quote a write returned; a created draft turns the create form into that quote's editor. */
  const adoptQuote = useCallback((adoptedQuoteId: number) => {
    setQuoteId(adoptedQuoteId);
    setCreateVehicleId(null);
  }, []);

  // The vehicle only names the draft, so a failed lookup costs the plate, not the editor.
  useReadFailureToast({
    failureMessageKey: vehicleQuery.isLoadingError ? 'quotes.errors.loadVehicleFailed' : null,
    errorUpdatedAt: vehicleQuery.errorUpdatedAt,
    isSuccess: vehicleQuery.isSuccess,
    readKey: String(createVehicleId ?? IDLE_QUERY_ENTITY_ID),
    showErrorToast,
  });

  const hasQuoteReadFailed = quoteQuery.isLoadingError;
  useReadFailureToast({
    failureMessageKey: hasQuoteReadFailed ? 'quotes.errors.loadQuoteFailed' : null,
    errorUpdatedAt: quoteQuery.errorUpdatedAt,
    isSuccess: quoteQuery.isSuccess,
    readKey: String(quoteId ?? IDLE_QUERY_ENTITY_ID),
    showErrorToast,
  });

  // A quote that cannot be read leaves nothing to edit, so the editor closes on every failed load,
  // also when the toast stays silent because the same read already toasted.
  useCloseOnFailure(hasQuoteReadFailed, close);

  return {
    isOpen,
    mode,
    vehicleId,
    vehicle,
    quote,
    isLoadingQuote,
    headerForm: header.headerForm,
    setHeaderForm: header.setHeaderForm,
    headerErrors: header.headerErrors,
    markHeaderSubmitAttempted: header.markHeaderSubmitAttempted,
    lineForm: lines.lineForm,
    setLineForm: lines.setLineForm,
    lineEditingTarget: lines.lineEditingTarget,
    startAddLine: lines.startAddLine,
    startEditLine: lines.startEditLine,
    cancelLineEditing,
    openCreate,
    openQuote,
    close,
    adoptQuote,
  };
}

/** Quote editor state and actions returned by useQuoteEditor. */
export type QuoteEditorState = ReturnType<typeof useQuoteEditor>;
