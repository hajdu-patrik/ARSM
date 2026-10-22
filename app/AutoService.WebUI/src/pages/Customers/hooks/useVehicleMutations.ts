import type { CustomerMutationToastHandlersWithWarning } from './mutation-toast.types';
import { useVehicleDeleteMutations } from './useVehicleDeleteMutations';
import { useVehicleFormMutations } from './useVehicleFormMutations';

interface UseVehicleMutationsParams extends CustomerMutationToastHandlersWithWarning {
  refreshAfterVehicleCreated: (customerId: number) => Promise<void>;
  refreshAfterVehicleUpdated: (customerId: number, vehicleId: number) => Promise<void>;
  refreshAfterVehicleDeleted: (customerId: number) => Promise<void>;
}

/** Encapsulates vehicle create/update/delete modal state and mutation side effects. */
export function useVehicleMutations({
  showSuccessToast,
  showErrorToast,
  showWarningToast,
  refreshAfterVehicleCreated,
  refreshAfterVehicleUpdated,
  refreshAfterVehicleDeleted,
}: UseVehicleMutationsParams) {
  const formMutations = useVehicleFormMutations({
    showSuccessToast,
    showErrorToast,
    showWarningToast,
    refreshAfterVehicleCreated,
    refreshAfterVehicleUpdated,
  });

  const deleteMutations = useVehicleDeleteMutations({
    showSuccessToast,
    showErrorToast,
    refreshAfterVehicleDeleted,
  });

  return {
    ...formMutations,
    ...deleteMutations,
  };
}
