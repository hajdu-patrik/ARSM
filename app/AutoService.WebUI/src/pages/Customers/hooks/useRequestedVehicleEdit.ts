/** Opens the vehicle editor for `?vehicleId=<id>` once, then clears the parameter; an unknown id is ignored silently. */
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';
import { customersQueries } from '../../../services/queries/customers.queries';
import { useAuthQueryScope } from '../../../services/queries/useAuthQueryScope';
import type { VehicleDetailDto } from '../../../types/customers/customers.types';

const IDLE_VEHICLE_ID = 0;

/** The positive integer id of the raw parameter, else null. */
function parseVehicleId(raw: string | null): number | null {
  const vehicleId = Number(raw);
  return raw !== null && Number.isInteger(vehicleId) && vehicleId > 0 ? vehicleId : null;
}

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
  const vehicle = query.data;
  const hasFailed = query.isError;

  useEffect(() => {
    if (requested === null) {
      return;
    }

    if (vehicleId !== null && vehicle === undefined && !hasFailed) {
      return;
    }

    // Consumed once, like the Quotes page does with quoteId.
    setSearchParams(new URLSearchParams(), { replace: true });

    if (vehicle !== undefined) {
      openEditVehicleModal(vehicle.customer.id, vehicle);
    }
  }, [hasFailed, openEditVehicleModal, requested, setSearchParams, vehicle, vehicleId]);
}
