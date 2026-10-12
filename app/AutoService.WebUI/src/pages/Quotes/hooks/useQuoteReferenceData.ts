/** Quote editor reference data: the full catalog option lists for the line editor and the vehicle appointments for the link. */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { LaborTypeDto, PartDto } from '../../../types/catalog/catalog.types';
import type { AppointmentDto } from '../../../types/scheduler/scheduler.types';
import { useReadFailureToast } from '../../../hooks/useReadFailureToast';
import { catalogQueries } from '../../../services/queries/catalog.queries';
import { customersQueries } from '../../../services/queries/customers.queries';
import { useAuthQueryScope } from '../../../services/queries/useAuthQueryScope';
import { IDLE_QUERY_ENTITY_ID, sortAppointmentsNewestFirst } from '../helpers';

/** Shared empty results, so a read that has not loaded yet does not hand out a new array on every render. */
const NO_PARTS: PartDto[] = [];
const NO_LABOR_TYPES: LaborTypeDto[] = [];
const NO_APPOINTMENTS: AppointmentDto[] = [];

/** External dependencies for the quote editor reference-data hook. */
interface UseQuoteReferenceDataParams {
  isOpen: boolean;
  vehicleId: number | null;
  showErrorToast: (key: string) => void;
}

/** Catalog and appointment options offered by the quote editor. */
export interface QuoteReferenceData {
  readonly parts: PartDto[];
  readonly laborTypes: LaborTypeDto[];
  readonly appointments: AppointmentDto[];
  readonly isLoadingCatalog: boolean;
}

/** Reads the catalog and the anchored vehicle's appointments while the editor is open. */
export function useQuoteReferenceData({
  isOpen,
  vehicleId,
  showErrorToast,
}: UseQuoteReferenceDataParams): QuoteReferenceData {
  const scope = useAuthQueryScope();
  const partsQuery = useQuery({ ...catalogQueries.partOptions(scope), enabled: isOpen });
  const laborTypesQuery = useQuery({ ...catalogQueries.laborTypeOptions(scope), enabled: isOpen });
  // The appointment link is optional, so a failed history read leaves the select empty without a toast.
  const historyQuery = useQuery({
    ...customersQueries.vehicleHistory(scope, vehicleId ?? IDLE_QUERY_ENTITY_ID),
    enabled: isOpen && vehicleId !== null,
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
