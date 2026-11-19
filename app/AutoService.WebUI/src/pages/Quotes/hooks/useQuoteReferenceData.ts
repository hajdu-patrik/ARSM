/** Quote editor reference data: the full catalog option lists for the line editor and the vehicle appointments for the link. */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { LaborTypeDto, PartDto } from '../../../types/catalog/catalog.types';
import type { QuoteDetailDto } from '../../../types/quotes/quotes.types';
import type { AppointmentDto } from '../../../types/scheduler/scheduler.types';
import { useReadFailureToast } from '../../../hooks/useReadFailureToast';
import { catalogQueries } from '../../../services/queries/catalog.queries';
import { customersQueries } from '../../../services/queries/customers.queries';
import { useAuthQueryScope } from '../../../services/queries/useAuthQueryScope';
import { canEditQuoteLines, IDLE_QUERY_ENTITY_ID, sortAppointmentsNewestFirst } from '../helpers';

/** Shared empty results, so a read that has not loaded yet does not hand out a new array on every render. */
const NO_PARTS: PartDto[] = [];
const NO_LABOR_TYPES: LaborTypeDto[] = [];
const NO_APPOINTMENTS: AppointmentDto[] = [];

interface UseQuoteReferenceDataParams {
  isOpen: boolean;
  vehicleId: number | null;
  quote: QuoteDetailDto | null;
  showErrorToast: (key: string) => void;
}

export interface QuoteReferenceData {
  readonly parts: PartDto[];
  readonly laborTypes: LaborTypeDto[];
  readonly appointments: AppointmentDto[];
  readonly isLoadingCatalog: boolean;
}

/** Reads the catalog and the vehicle history only while the open quote needs them. */
export function useQuoteReferenceData({
  isOpen,
  vehicleId,
  quote,
  showErrorToast,
}: UseQuoteReferenceDataParams): QuoteReferenceData {
  const scope = useAuthQueryScope();
  // Only editable lines pick from the catalog; the history is read to choose a link (create) or to label the saved one.
  const isCatalogNeeded = isOpen && canEditQuoteLines(quote);
  const isHistoryNeeded = isOpen && vehicleId !== null && (quote === null || quote.appointmentId !== null);
  const partsQuery = useQuery({ ...catalogQueries.partOptions(scope), enabled: isCatalogNeeded });
  const laborTypesQuery = useQuery({ ...catalogQueries.laborTypeOptions(scope), enabled: isCatalogNeeded });
  // The appointment link is optional, so a failed history read leaves the select empty without a toast.
  const historyQuery = useQuery({
    ...customersQueries.vehicleHistory(scope, vehicleId ?? IDLE_QUERY_ENTITY_ID),
    enabled: isHistoryNeeded,
  });

  const history = historyQuery.data;
  const appointments = useMemo(() => sortAppointmentsNewestFirst(history ?? NO_APPOINTMENTS), [history]);

  // The two catalog reads fold into one: it fails when either does, and succeeds when both did.
  const hasCatalogFailed = partsQuery.isLoadingError || laborTypesQuery.isLoadingError;
  useReadFailureToast({
    failureMessageKey: hasCatalogFailed ? 'quotes.errors.loadCatalogFailed' : null,
    errorUpdatedAt: Math.max(partsQuery.errorUpdatedAt, laborTypesQuery.errorUpdatedAt),
    isSuccess: partsQuery.isSuccess && laborTypesQuery.isSuccess,
    showErrorToast,
  });

  return {
    parts: partsQuery.data ?? NO_PARTS,
    laborTypes: laborTypesQuery.data ?? NO_LABOR_TYPES,
    appointments,
    isLoadingCatalog: partsQuery.isLoading || laborTypesQuery.isLoading,
  };
}
