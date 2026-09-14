/**
 * Reference data the quote editor picks from: the part and labor-type
 * catalog behind the line editor, and the anchored vehicle's appointments
 * behind the optional appointment link.
 *
 * Every read goes through the same query keys the Inventory and Customers
 * pages use, so opening the editor reuses whatever those pages already
 * cached instead of refetching it.
 * @module pages/Quotes/hooks/useQuoteReferenceData
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { LaborTypeDto, PartDto } from '../../../types/catalog/catalog.types';
import type { AppointmentDto } from '../../../types/scheduler/scheduler.types';
import { partService } from '../../../services/catalog/part.service';
import { laborTypeService } from '../../../services/catalog/labor-type.service';
import { customerRegistryService } from '../../../services/customers/customer-registry.service';
import {
  CATALOG_STALE_TIME_MS,
  CUSTOMER_HISTORY_STALE_TIME_MS,
  PERSISTED_QUERY_CACHE_MAX_AGE_MS,
} from '../../../services/cache/cache-policy';
import { getAuthQueryScope, queryKeys } from '../../../services/cache/queryKeys';
import { useAuthStore } from '../../../store/auth.store';

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

/**
 * Loads the catalog and the anchored vehicle's appointments while the editor is open.
 * @param params Editor open state, the anchored vehicle, and the error toast handler.
 * @returns Catalog entries, appointment options, and the catalog loading flag.
 */
export function useQuoteReferenceData({
  isOpen,
  vehicleId,
  showErrorToast,
}: UseQuoteReferenceDataParams): QuoteReferenceData {
  const queryClient = useQueryClient();
  const authUser = useAuthStore((state) => state.user);
  const authScope = useMemo(() => getAuthQueryScope(authUser), [authUser]);
  const [parts, setParts] = useState<PartDto[]>([]);
  const [laborTypes, setLaborTypes] = useState<LaborTypeDto[]>([]);
  const [appointments, setAppointments] = useState<AppointmentDto[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);

  const loadCatalog = useCallback(async () => {
    if (!authScope) {
      return;
    }

    setIsLoadingCatalog(true);

    try {
      const [loadedParts, loadedLaborTypes] = await Promise.all([
        queryClient.fetchQuery({
          gcTime: PERSISTED_QUERY_CACHE_MAX_AGE_MS,
          queryFn: partService.listParts,
          queryKey: queryKeys.catalog.parts(authScope),
          staleTime: CATALOG_STALE_TIME_MS,
        }),
        queryClient.fetchQuery({
          gcTime: PERSISTED_QUERY_CACHE_MAX_AGE_MS,
          queryFn: laborTypeService.listLaborTypes,
          queryKey: queryKeys.catalog.laborTypes(authScope),
          staleTime: CATALOG_STALE_TIME_MS,
        }),
      ]);

      setParts(loadedParts);
      setLaborTypes(loadedLaborTypes);
    } catch {
      showErrorToast('quotes.errors.loadCatalogFailed');
    } finally {
      setIsLoadingCatalog(false);
    }
  }, [authScope, queryClient, showErrorToast]);

  const loadAppointments = useCallback(async (targetVehicleId: number) => {
    if (!authScope) {
      return;
    }

    try {
      const data = await queryClient.fetchQuery({
        gcTime: PERSISTED_QUERY_CACHE_MAX_AGE_MS,
        queryFn: () => customerRegistryService.getVehicleHistory(targetVehicleId, true),
        queryKey: queryKeys.customers.vehicleHistory(authScope, targetVehicleId),
        staleTime: CUSTOMER_HISTORY_STALE_TIME_MS,
      });
      setAppointments(data);
    } catch {
      // The appointment link is optional, so a failed lookup leaves the select
      // empty instead of blocking the whole editor with an error toast.
      setAppointments([]);
    }
  }, [authScope, queryClient]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    void loadCatalog();
  }, [isOpen, loadCatalog]);

  useEffect(() => {
    if (!isOpen || vehicleId === null) {
      setAppointments([]);
      return;
    }

    void loadAppointments(vehicleId);
  }, [isOpen, loadAppointments, vehicleId]);

  return { parts, laborTypes, appointments, isLoadingCatalog };
}
