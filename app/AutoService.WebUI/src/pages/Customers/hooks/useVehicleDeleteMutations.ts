/**
 * Vehicle delete mutation hook.
 * Coordinates delete confirmation state, server deletion, and local cache cleanup.
 * @module pages/Customers/hooks/useVehicleDeleteMutations
 */
import { useCallback, useState } from 'react';
import type { AppointmentDto } from '../../../types/scheduler/scheduler.types';
import type {
  CustomerListItem,
  VehicleDetailDto,
} from '../../../types/customers/customers.types';
import { customerRegistryService } from '../../../services/customers/customer-registry.service';
import type { DeleteVehicleTarget } from '../page.types';

/** Dependencies required by vehicle delete mutation handlers. */
interface UseVehicleDeleteMutationsParams {
  showSuccessToast: (message: string) => void;
  showErrorToast: (message: string) => void;
  customerHistoryByCustomerId: Record<number, AppointmentDto[]>;
  setCustomers: React.Dispatch<React.SetStateAction<CustomerListItem[]>>;
  setVehiclesByCustomerId: React.Dispatch<React.SetStateAction<Record<number, VehicleDetailDto[]>>>;
  setVehicleHistoryByVehicleId: React.Dispatch<React.SetStateAction<Record<number, AppointmentDto[]>>>;
  setActiveVehicleHistoryByCustomerId: React.Dispatch<React.SetStateAction<Record<number, number | null>>>;
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
  setCustomers,
  setVehiclesByCustomerId,
  setVehicleHistoryByVehicleId,
  setActiveVehicleHistoryByCustomerId,
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
    setVehiclesByCustomerId((prev) => ({
      ...prev,
      [target.customerId]: (prev[target.customerId] ?? []).filter(
        (vehicle) => vehicle.id !== target.vehicle.id,
      ),
    }));

    setCustomers((prev) => prev.map((item) => (
      item.id === target.customerId
        ? { ...item, vehicleCount: Math.max(0, item.vehicleCount - 1) }
        : item
    )));

    setVehicleHistoryByVehicleId((prev) => {
      const next = { ...prev };
      delete next[target.vehicle.id];
      return next;
    });

    setActiveVehicleHistoryByCustomerId((prev) => ({
      ...prev,
      [target.customerId]: prev[target.customerId] === target.vehicle.id
        ? null
        : prev[target.customerId],
    }));
  }, [setActiveVehicleHistoryByCustomerId, setCustomers, setVehicleHistoryByVehicleId, setVehiclesByCustomerId]);

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
