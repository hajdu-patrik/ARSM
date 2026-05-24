/**
 * Vehicle delete mutation hook.
 * Coordinates delete confirmation state, server deletion, and local cache cleanup.
 * @module pages/Customers/hooks/useVehicleDeleteMutations
 */
import { useCallback, useState } from 'react';
import type { AppointmentDto } from '../../../types/scheduler/scheduler.types';
import type { VehicleDetailDto } from '../../../types/customers/customers.types';
import { customerRegistryService } from '../../../services/customers/customer-registry.service';
import type { DeleteVehicleTarget } from '../page.types';
import type { CustomerMutationToastHandlers } from './mutation-toast.types';

/** Dependencies required by vehicle delete mutation handlers. */
interface UseVehicleDeleteMutationsParams extends CustomerMutationToastHandlers {
  customerHistoryByCustomerId: Record<number, AppointmentDto[]>;
  applyVehicleDeleted: (customerId: number, vehicleId: number) => void;
  loadCustomerHistory: (customerId: number, force?: boolean) => Promise<void>;
}

/**
 * Manages vehicle delete confirmation state and mutation side effects.
 * @param params Shared list-state setters, history loaders, and localized toast handlers.
 * @returns Delete modal state and actions.
 */
export function useVehicleDeleteMutations({
  showSuccessToast,
  showErrorToast,
  customerHistoryByCustomerId,
  applyVehicleDeleted,
  loadCustomerHistory,
}: UseVehicleDeleteMutationsParams) {
  const [deleteVehicleTarget, setDeleteVehicleTarget] = useState<DeleteVehicleTarget | null>(null);
  const [isDeletingVehicle, setIsDeletingVehicle] = useState(false);

  const openDeleteVehicleModal = useCallback((customerId: number, vehicle: VehicleDetailDto) => {
    setDeleteVehicleTarget({ customerId, vehicle });
  }, []);

  const closeDeleteVehicleModal = useCallback(() => {
    if (isDeletingVehicle) {
      return;
    }

    setDeleteVehicleTarget(null);
  }, [isDeletingVehicle]);

  const applyDeletedVehicleToState = useCallback((target: DeleteVehicleTarget) => {
    applyVehicleDeleted(target.customerId, target.vehicle.id);
  }, [applyVehicleDeleted]);

  const reloadCustomerHistoryIfNeeded = useCallback((customerId: number) => {
    if (customerHistoryByCustomerId[customerId]) {
      void loadCustomerHistory(customerId, true);
    }
  }, [customerHistoryByCustomerId, loadCustomerHistory]);

  const handleDeleteVehicle = useCallback(async () => {
    if (!deleteVehicleTarget) {
      return;
    }

    const target = deleteVehicleTarget;

    setIsDeletingVehicle(true);

    try {
      await customerRegistryService.deleteVehicle(target.vehicle.id);
      applyDeletedVehicleToState(target);
      reloadCustomerHistoryIfNeeded(target.customerId);

      showSuccessToast('customers.toasts.vehicleDeleted');
      setDeleteVehicleTarget(null);
    } catch {
      showErrorToast('customers.errors.vehicleDeleteFailed');
    } finally {
      setIsDeletingVehicle(false);
    }
  }, [
    applyDeletedVehicleToState,
    deleteVehicleTarget,
    reloadCustomerHistoryIfNeeded,
    showErrorToast,
    showSuccessToast,
  ]);

  return {
    deleteVehicleTarget,
    isDeletingVehicle,
    openDeleteVehicleModal,
    closeDeleteVehicleModal,
    handleDeleteVehicle,
  };
}
