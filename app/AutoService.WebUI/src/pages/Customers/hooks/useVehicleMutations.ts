import { useCallback, useState } from 'react';
import type { ServerFieldErrors } from '../../../utils/serverValidation';
import type { AppointmentDto } from '../../../types/scheduler/scheduler.types';
import type {
  CreateVehicleRequest,
  CustomerListItem,
  UpdateVehicleRequest,
  VehicleDetailDto,
} from '../../../types/customers/customers.types';
import { customerRegistryService } from '../../../services/customers/customer-registry.service';
import {
  buildVehicleNumericFieldErrors,
  hasServerFieldErrors,
  parseVehicleNumericValues,
  type VehicleFormState,
} from '../helpers';
import type {
  DeleteVehicleTarget,
  VehicleModalMode,
} from '../page.types';
import { buildVehiclePayload, showVehicleMutationError } from './vehicleMutation.helpers';

const EMPTY_VEHICLE_FORM: VehicleFormState = {
  licensePlate: '',
  brand: '',
  model: '',
  year: '',
  mileageKm: '',
  enginePowerHp: '',
  engineTorqueNm: '',
};

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
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [vehicleModalMode, setVehicleModalMode] = useState<VehicleModalMode>('create');
  const [vehicleModalCustomerId, setVehicleModalCustomerId] = useState<number | null>(null);
  const [editingVehicleId, setEditingVehicleId] = useState<number | null>(null);
  const [vehicleForm, setVehicleForm] = useState<VehicleFormState>(EMPTY_VEHICLE_FORM);
  const [isSavingVehicle, setIsSavingVehicle] = useState(false);

  const [deleteVehicleTarget, setDeleteVehicleTarget] = useState<DeleteVehicleTarget | null>(null);
  const [isDeletingVehicle, setIsDeletingVehicle] = useState(false);

  const openCreateVehicleModal = useCallback((customerId: number) => {
    setVehicleModalMode('create');
    setVehicleModalCustomerId(customerId);
    setEditingVehicleId(null);
    setVehicleForm(EMPTY_VEHICLE_FORM);
    setVehicleModalOpen(true);
  }, []);

  const openEditVehicleModal = useCallback((customerId: number, vehicle: VehicleDetailDto) => {
    setVehicleModalMode('edit');
    setVehicleModalCustomerId(customerId);
    setEditingVehicleId(vehicle.id);
    setVehicleForm({
      licensePlate: vehicle.licensePlate,
      brand: vehicle.brand,
      model: vehicle.model,
      year: String(vehicle.year),
      mileageKm: String(vehicle.mileageKm),
      enginePowerHp: String(vehicle.enginePowerHp),
      engineTorqueNm: String(vehicle.engineTorqueNm),
    });
    setVehicleModalOpen(true);
  }, []);

  const closeVehicleModal = useCallback(() => {
    if (isSavingVehicle) {
      return;
    }

    setVehicleModalOpen(false);
  }, [isSavingVehicle]);

  const persistVehicleMutation = useCallback(async (
    customerId: number,
    payload: CreateVehicleRequest | UpdateVehicleRequest,
  ) => {
    if (vehicleModalMode === 'create') {
      const created = await customerRegistryService.createVehicle(customerId, payload);

      setVehiclesByCustomerId((prev) => ({
        ...prev,
        [customerId]: [...(prev[customerId] ?? []), created],
      }));

      setCustomers((prev) => prev.map((item) => (
        item.id === customerId
          ? { ...item, vehicleCount: item.vehicleCount + 1 }
          : item
      )));

      showSuccessToast('customers.toasts.vehicleCreated');
      return;
    }

    if (editingVehicleId === null) {
      return;
    }

    await customerRegistryService.updateVehicle(editingVehicleId, payload);

    setVehiclesByCustomerId((prev) => ({
      ...prev,
      [customerId]: (prev[customerId] ?? []).map((vehicle) => (
        vehicle.id === editingVehicleId
          ? {
            ...vehicle,
            licensePlate: payload.licensePlate,
            brand: payload.brand,
            model: payload.model,
            year: payload.year,
            mileageKm: payload.mileageKm,
            enginePowerHp: payload.enginePowerHp,
            engineTorqueNm: payload.engineTorqueNm,
          }
          : vehicle
      )),
    }));

    if (customerHistoryByCustomerId[customerId]) {
      void loadCustomerHistory(customerId, true);
    }

    if (vehicleHistoryByVehicleId[editingVehicleId]) {
      void loadVehicleHistory(editingVehicleId, true);
    }

    showSuccessToast('customers.toasts.vehicleUpdated');
  }, [
    customerHistoryByCustomerId,
    editingVehicleId,
    loadCustomerHistory,
    loadVehicleHistory,
    setCustomers,
    setVehiclesByCustomerId,
    showSuccessToast,
    vehicleHistoryByVehicleId,
    vehicleModalMode,
  ]);

  const handleSubmitVehicle = useCallback(async (event: React.SyntheticEvent) => {
    event.preventDefault();

    if (vehicleModalCustomerId === null) {
      return;
    }

    const numericValues = parseVehicleNumericValues(vehicleForm);
    const numericFieldErrors = buildVehicleNumericFieldErrors(numericValues);

    if (hasServerFieldErrors(numericFieldErrors)) {
      showErrorToast(getFirstFieldErrorMessage(numericFieldErrors) ?? 'customers.errors.vehicleSaveFailed');
      return;
    }

    const { payload, fieldError } = buildVehiclePayload(vehicleForm);

    if (fieldError) {
      showErrorToast(fieldError);
      return;
    }

    setIsSavingVehicle(true);

    try {
      await persistVehicleMutation(vehicleModalCustomerId, payload);
      setVehicleModalOpen(false);
    } catch (error) {
      showVehicleMutationError(error, showErrorToast, getFirstFieldErrorMessage);
    } finally {
      setIsSavingVehicle(false);
    }
  }, [
    getFirstFieldErrorMessage,
    persistVehicleMutation,
    showErrorToast,
    vehicleForm,
    vehicleModalCustomerId,
  ]);

  const openDeleteVehicleModal = useCallback((customerId: number, vehicle: VehicleDetailDto) => {
    setDeleteVehicleTarget({ customerId, vehicle });
  }, []);

  const closeDeleteVehicleModal = useCallback(() => {
    if (isDeletingVehicle) {
      return;
    }

    setDeleteVehicleTarget(null);
  }, [isDeletingVehicle]);

  const handleDeleteVehicle = useCallback(async () => {
    if (!deleteVehicleTarget) {
      return;
    }

    setIsDeletingVehicle(true);

    try {
      await customerRegistryService.deleteVehicle(deleteVehicleTarget.vehicle.id);

      setVehiclesByCustomerId((prev) => ({
        ...prev,
        [deleteVehicleTarget.customerId]: (prev[deleteVehicleTarget.customerId] ?? []).filter(
          (vehicle) => vehicle.id !== deleteVehicleTarget.vehicle.id,
        ),
      }));

      setCustomers((prev) => prev.map((item) => (
        item.id === deleteVehicleTarget.customerId
          ? { ...item, vehicleCount: Math.max(0, item.vehicleCount - 1) }
          : item
      )));

      setVehicleHistoryByVehicleId((prev) => {
        const next = { ...prev };
        delete next[deleteVehicleTarget.vehicle.id];
        return next;
      });

      setActiveVehicleHistoryByCustomerId((prev) => ({
        ...prev,
        [deleteVehicleTarget.customerId]: prev[deleteVehicleTarget.customerId] === deleteVehicleTarget.vehicle.id
          ? null
          : prev[deleteVehicleTarget.customerId],
      }));

      if (customerHistoryByCustomerId[deleteVehicleTarget.customerId]) {
        void loadCustomerHistory(deleteVehicleTarget.customerId, true);
      }

      showSuccessToast('customers.toasts.vehicleDeleted');
      setDeleteVehicleTarget(null);
    } catch {
      showErrorToast('customers.errors.vehicleDeleteFailed');
    } finally {
      setIsDeletingVehicle(false);
    }
  }, [
    customerHistoryByCustomerId,
    deleteVehicleTarget,
    loadCustomerHistory,
    setActiveVehicleHistoryByCustomerId,
    setCustomers,
    setVehicleHistoryByVehicleId,
    setVehiclesByCustomerId,
    showErrorToast,
    showSuccessToast,
  ]);

  return {
    vehicleModalOpen,
    vehicleModalMode,
    vehicleForm,
    setVehicleForm,
    isSavingVehicle,
    deleteVehicleTarget,
    isDeletingVehicle,
    openCreateVehicleModal,
    openEditVehicleModal,
    closeVehicleModal,
    handleSubmitVehicle,
    openDeleteVehicleModal,
    closeDeleteVehicleModal,
    handleDeleteVehicle,
  };
}
