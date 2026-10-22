/** Vehicle delete mutation hook: coordinates confirmation state, the server deletion, and the cache refresh. */
import { useCallback, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import type { VehicleDetailDto } from '../../../types/customers/customers.types';
import { customerRegistryService } from '../../../services/customers/customer-registry.service';
import type { DeleteVehicleTarget } from '../page.types';
import type { CustomerMutationToastHandlers } from './mutation-toast.types';

interface UseVehicleDeleteMutationsParams extends CustomerMutationToastHandlers {
  refreshAfterVehicleDeleted: (customerId: number) => Promise<void>;
}

export function useVehicleDeleteMutations({
  showSuccessToast,
  showErrorToast,
  refreshAfterVehicleDeleted,
}: UseVehicleDeleteMutationsParams) {
  const [deleteVehicleTarget, setDeleteVehicleTarget] = useState<DeleteVehicleTarget | null>(null);

  const { mutate: deleteVehicle, isPending: isDeletingVehicle } = useMutation({
    mutationFn: (target: DeleteVehicleTarget) => customerRegistryService.deleteVehicle(target.vehicle.id),
    onSuccess: async (_result, target) => {
      await refreshAfterVehicleDeleted(target.customerId);
      showSuccessToast('customers.toasts.vehicleDeleted');
      setDeleteVehicleTarget(null);
    },
    onError: () => {
      showErrorToast('customers.errors.vehicleDeleteFailed');
    },
  });

  const openDeleteVehicleModal = useCallback((customerId: number, vehicle: VehicleDetailDto) => {
    setDeleteVehicleTarget({ customerId, vehicle });
  }, []);

  const closeDeleteVehicleModal = useCallback(() => {
    if (isDeletingVehicle) {
      return;
    }

    setDeleteVehicleTarget(null);
  }, [isDeletingVehicle]);

  const handleDeleteVehicle = useCallback(() => {
    if (deleteVehicleTarget) {
      deleteVehicle(deleteVehicleTarget);
    }
  }, [deleteVehicle, deleteVehicleTarget]);

  return {
    deleteVehicleTarget,
    isDeletingVehicle,
    openDeleteVehicleModal,
    closeDeleteVehicleModal,
    handleDeleteVehicle,
  };
}
