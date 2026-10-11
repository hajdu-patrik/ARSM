import type { ServerFieldErrors } from '../../../utils/serverValidation';
import type { CustomerMutationToastHandlersWithWarning } from './mutation-toast.types';
import { useVehicleDeleteMutations } from './useVehicleDeleteMutations';
import { useVehicleFormMutations } from './useVehicleFormMutations';

/** External dependencies required by vehicle mutation handlers. */
interface UseVehicleMutationsParams extends CustomerMutationToastHandlersWithWarning {
  getFirstFieldErrorMessage: (errors: ServerFieldErrors) => string | null;
  refreshAfterVehicleCreated: (customerId: number) => Promise<void>;
  refreshAfterVehicleUpdated: (customerId: number, vehicleId: number) => Promise<void>;
  refreshAfterVehicleDeleted: (customerId: number) => Promise<void>;
}

/** Encapsulates vehicle create/update/delete modal state and mutation side effects. */
export function useVehicleMutations({
  showSuccessToast,
  showErrorToast,
  showWarningToast,
  getFirstFieldErrorMessage,
  refreshAfterVehicleCreated,
  refreshAfterVehicleUpdated,
  refreshAfterVehicleDeleted,
}: UseVehicleMutationsParams) {
  const formMutations = useVehicleFormMutations({
    showSuccessToast,
    showErrorToast,
    showWarningToast,
    getFirstFieldErrorMessage,
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
