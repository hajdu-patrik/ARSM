/** Opens an appointment's vehicle in the vehicle editor of the Customers page. */
import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { APP_ROUTE_PATHS } from '../router/appRoutes';

export function useAppointmentVehicleLink(vehicleId: number): () => void {
  const navigate = useNavigate();

  return useCallback(() => {
    void navigate(`${APP_ROUTE_PATHS.customers}?vehicleId=${String(vehicleId)}`);
  }, [navigate, vehicleId]);
}
