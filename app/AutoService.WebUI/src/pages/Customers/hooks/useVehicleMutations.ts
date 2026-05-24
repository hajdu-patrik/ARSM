import type { ServerFieldErrors } from '../../../utils/serverValidation';
import type { AppointmentDto } from '../../../types/scheduler/scheduler.types';
import type {
  CreateVehicleRequest,
  UpdateVehicleRequest,
  VehicleDetailDto,
} from '../../../types/customers/customers.types';
import type { CustomerMutationToastHandlersWithWarning } from './mutation-toast.types';
import { useVehicleDeleteMutations } from './useVehicleDeleteMutations';
import { useVehicleFormMutations } from './useVehicleFormMutations';

/** External dependencies required by vehicle mutation handlers. */
interface UseVehicleMutationsParams extends CustomerMutationToastHandlersWithWarning {
  getFirstFieldErrorMessage: (errors: ServerFieldErrors) => string | null;
  customerHistoryByCustomerId: Record<number, AppointmentDto[]>;
  vehicleHistoryByVehicleId: Record<number, AppointmentDto[]>;
  applyVehicleCreated: (customerId: number, createdVehicle: VehicleDetailDto) => void;
  applyVehicleUpdated: (
    customerId: number,
    vehicleId: number,
    payload: CreateVehicleRequest | UpdateVehicleRequest,
  ) => void;
  applyVehicleDeleted: (customerId: number, vehicleId: number) => void;
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
  showWarningToast,
  getFirstFieldErrorMessage,
  customerHistoryByCustomerId,
  vehicleHistoryByVehicleId,
  applyVehicleCreated,
  applyVehicleUpdated,
  applyVehicleDeleted,
  loadCustomerHistory,
  loadVehicleHistory,
}: UseVehicleMutationsParams) {
  const formMutations = useVehicleFormMutations({
    showSuccessToast,
    showErrorToast,
    showWarningToast,
    getFirstFieldErrorMessage,
    customerHistoryByCustomerId,
    vehicleHistoryByVehicleId,
    applyVehicleCreated,
    applyVehicleUpdated,
    loadCustomerHistory,
    loadVehicleHistory,
  });

  const deleteMutations = useVehicleDeleteMutations({
    showSuccessToast,
    showErrorToast,
    customerHistoryByCustomerId,
    applyVehicleDeleted,
    loadCustomerHistory,
  });

  return {
    ...formMutations,
    ...deleteMutations,
  };
}