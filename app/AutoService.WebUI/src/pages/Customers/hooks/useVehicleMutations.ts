import type { ServerFieldErrors } from '../../../utils/serverValidation';
import type { AppointmentDto } from '../../../types/scheduler/scheduler.types';
import type {
  CustomerListItem,
  VehicleDetailDto,
} from '../../../types/customers/customers.types';
import { useVehicleDeleteMutations } from './useVehicleDeleteMutations';
import { useVehicleFormMutations } from './useVehicleFormMutations';

/** External dependencies required by vehicle mutation handlers. */
interface UseVehicleMutationsParams {
  showSuccessToast: (message: string) => void;
  showErrorToast: (message: string) => void;
  getFirstFieldErrorMessage: (errors: ServerFieldErrors) => string | null;
  customerHistoryByCustomerId: Record<number, AppointmentDto[]>;
  vehicleHistoryByVehicleId: Record<number, AppointmentDto[]>;
  setCustomers: React.Dispatch<React.SetStateAction<CustomerListItem[]>>;
  setVehiclesByCustomerId: React.Dispatch<React.SetStateAction<Record<number, VehicleDetailDto[]>>>;
  setVehicleHistoryByVehicleId: React.Dispatch<React.SetStateAction<Record<number, AppointmentDto[]>>>;
  setActiveVehicleHistoryByCustomerId: React.Dispatch<React.SetStateAction<Record<number, number | null>>>;
  loadCustomerHistory: (customerId: number, force?: boolean) => Promise<void>;
  loadVehicleHistory: (vehicleId: number, force?: boolean) => Promise<void>;
}

/**
 * Encapsulates vehicle create/update/delete modal state and mutation side effects.
 * @param params Shared page state, loaders, and notification handlers.
 * @returns Modal state plus mutation actions for vehicle operations.
 */
export function useVehicleMutations({
  showSuccessToast,
  showErrorToast,
  getFirstFieldErrorMessage,
  customerHistoryByCustomerId,
  vehicleHistoryByVehicleId,
  setCustomers,
  setVehiclesByCustomerId,
  setVehicleHistoryByVehicleId,
  setActiveVehicleHistoryByCustomerId,
  loadCustomerHistory,
  loadVehicleHistory,
}: UseVehicleMutationsParams) {
  const formMutations = useVehicleFormMutations({
    showSuccessToast,
    showErrorToast,
    getFirstFieldErrorMessage,
    customerHistoryByCustomerId,
    vehicleHistoryByVehicleId,
    setCustomers,
    setVehiclesByCustomerId,
    loadCustomerHistory,
    loadVehicleHistory,
  });

  const deleteMutations = useVehicleDeleteMutations({
    showSuccessToast,
    showErrorToast,
    customerHistoryByCustomerId,
    setCustomers,
    setVehiclesByCustomerId,
    setVehicleHistoryByVehicleId,
    setActiveVehicleHistoryByCustomerId,
    loadCustomerHistory,
  });

  return {
    ...formMutations,
    ...deleteMutations,
  };
}