import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';
import { useQueryReadFailureToast } from '../../../hooks/useReadFailureToast';
import { customersQueries } from '../../../services/queries/customers.queries';
import { useAuthQueryScope } from '../../../services/queries/useAuthQueryScope';
import { useToastStore } from '../../../store/toast.store';
import type { VehicleDetailDto } from '../../../types/customers/customers.types';

const IDLE_VEHICLE_ID = 0;

/** The positive integer id of the raw parameter, else null. */
function parseVehicleId(raw: string | null): number | null {
  const vehicleId = Number(raw);
  return raw !== null && Number.isInteger(vehicleId) && vehicleId > 0 ? vehicleId : null;
}

/** Opens the vehicle editor for `?vehicleId=<id>` once, then clears the parameter; an invalid id is ignored, a failed read toasts. */
export function useRequestedVehicleEdit(
  openEditVehicleModal: (customerId: number, vehicle: VehicleDetailDto) => void,
): void {
  const scope = useAuthQueryScope();
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get('vehicleId');
  const vehicleId = parseVehicleId(requested);

  const query = useQuery({
    ...customersQueries.vehicle(scope, vehicleId ?? IDLE_VEHICLE_ID),
    enabled: vehicleId !== null,
  });
  const showErrorToast = useToastStore((state) => state.showError);
  useQueryReadFailureToast(query, 'customers.errors.vehiclesLoadFailed', showErrorToast, String(vehicleId));
  const vehicle = query.data;
  const hasFailed = query.isError;
  const isFetching = query.isFetching;

  useEffect(() => {
    if (requested === null) {
      return;
    }

    // Wait for the fresh read, so a stale cached vehicle never seeds the editor.
    if (vehicleId !== null && (vehicle === undefined || isFetching) && !hasFailed) {
      return;
    }

    // Consumed once, like the Quotes page does with quoteId.
    setSearchParams(new URLSearchParams(), { replace: true });

    if (vehicle !== undefined) {
      openEditVehicleModal(vehicle.customer.id, vehicle);
    }
  }, [hasFailed, isFetching, openEditVehicleModal, requested, setSearchParams, vehicle, vehicleId]);
}
