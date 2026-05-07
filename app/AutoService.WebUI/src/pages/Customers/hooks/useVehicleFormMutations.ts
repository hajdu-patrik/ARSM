/**
 * Vehicle create/update mutation hook.
 * Coordinates modal state, payload validation, server calls, and local cache updates.
 * @module pages/Customers/hooks/useVehicleFormMutations
 */
import { useCallback, useState } from 'react';
import { isAxiosError } from 'axios';
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
  mapVehicleValidationMessageToKey,
  parseVehicleNumericValues,
  type VehicleFormState,
} from '../helpers';
import {
  extractServerFieldErrors,
  normalizeServerFieldErrors,
} from '../../../utils/serverValidation';
import type { VehicleModalMode } from '../page.types';
import { buildVehiclePayload } from './vehicleMutation.helpers';

const EMPTY_VEHICLE_FORM: VehicleFormState = {
  licensePlate: '',
  brand: '',
  model: '',
  year: '',
  mileageKm: '',
  enginePowerHp: '',
  engineTorqueNm: '',
};

/** Dependencies required by vehicle create/edit mutation handlers. */
interface UseVehicleFormMutationsParams {
  showSuccessToast: (message: string) => void;
  showErrorToast: (message: string) => void;
  getFirstFieldErrorMessage: (errors: ServerFieldErrors) => string | null;
  customerHistoryByCustomerId: Record<number, AppointmentDto[]>;
  vehicleHistoryByVehicleId: Record<number, AppointmentDto[]>;
  setCustomers: React.Dispatch<React.SetStateAction<CustomerListItem[]>>;
  setVehiclesByCustomerId: React.Dispatch<React.SetStateAction<Record<number, VehicleDetailDto[]>>>;
  loadCustomerHistory: (customerId: number, force?: boolean) => Promise<void>;
  loadVehicleHistory: (vehicleId: number, force?: boolean) => Promise<void>;
}

/**
 * Manages vehicle form modal state and create/update mutations.
 * @param params Shared list-state setters, loaders, and localized toast handlers.
 * @returns Vehicle form modal state and actions.
 */
export function useVehicleFormMutations({
  showSuccessToast,
  showErrorToast,
  getFirstFieldErrorMessage,
  customerHistoryByCustomerId,
  vehicleHistoryByVehicleId,
  setCustomers,
  setVehiclesByCustomerId,
  loadCustomerHistory,
  loadVehicleHistory,
}: UseVehicleFormMutationsParams) {
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [vehicleModalMode, setVehicleModalMode] = useState<VehicleModalMode>('create');
  const [vehicleModalCustomerId, setVehicleModalCustomerId] = useState<number | null>(null);
  const [editingVehicleId, setEditingVehicleId] = useState<number | null>(null);
  const [editingVehicleSnapshot, setEditingVehicleSnapshot] = useState<VehicleDetailDto | null>(null);
  const [vehicleForm, setVehicleForm] = useState<VehicleFormState>(EMPTY_VEHICLE_FORM);
  const [isSavingVehicle, setIsSavingVehicle] = useState(false);

  const openCreateVehicleModal = useCallback((customerId: number) => {
    setVehicleModalMode('create');
    setVehicleModalCustomerId(customerId);
    setEditingVehicleId(null);
    setEditingVehicleSnapshot(null);
    setVehicleForm(EMPTY_VEHICLE_FORM);
    setVehicleModalOpen(true);
  }, []);

  const openEditVehicleModal = useCallback((customerId: number, vehicle: VehicleDetailDto) => {
    setVehicleModalMode('edit');
    setVehicleModalCustomerId(customerId);
    setEditingVehicleId(vehicle.id);
    setEditingVehicleSnapshot(vehicle);
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

  const hasRequiredFieldError = useCallback((errors: ServerFieldErrors, fieldName: string) => {
    const variants = [fieldName, fieldName.toLowerCase(), fieldName.charAt(0).toUpperCase() + fieldName.slice(1)];
    return variants.some((variant) => (errors[variant] ?? []).includes('customers.errors.fieldRequired'));
  }, []);

  const restoreRequiredVehicleFields = useCallback((errors: ServerFieldErrors) => {
    if (vehicleModalMode !== 'edit' || !editingVehicleSnapshot) {
      return;
    }

    setVehicleForm((prev) => ({
      ...prev,
      licensePlate: !prev.licensePlate.trim() && hasRequiredFieldError(errors, 'licensePlate')
        ? editingVehicleSnapshot.licensePlate
        : prev.licensePlate,
      brand: !prev.brand.trim() && hasRequiredFieldError(errors, 'brand')
        ? editingVehicleSnapshot.brand
        : prev.brand,
      model: !prev.model.trim() && hasRequiredFieldError(errors, 'model')
        ? editingVehicleSnapshot.model
        : prev.model,
    }));
  }, [editingVehicleSnapshot, hasRequiredFieldError, vehicleModalMode]);

  const handleSubmitVehicleError = useCallback((error: unknown) => {
    if (!isAxiosError<{ detail?: string; errors?: ServerFieldErrors }>(error)) {
      showErrorToast('customers.errors.vehicleSaveFailed');
      return;
    }

    const responseData = error.response?.data;
    const mappedFieldErrors = normalizeServerFieldErrors(
      extractServerFieldErrors(responseData),
      mapVehicleValidationMessageToKey,
    );

    if (hasServerFieldErrors(mappedFieldErrors)) {
      restoreRequiredVehicleFields(mappedFieldErrors);
      showErrorToast(getFirstFieldErrorMessage(mappedFieldErrors) ?? 'customers.errors.vehicleSaveFailed');
      return;
    }

    const detailKey = responseData?.detail
      ? mapVehicleValidationMessageToKey(responseData.detail)
      : 'customers.errors.vehicleSaveFailed';
    showErrorToast(detailKey);
  }, [getFirstFieldErrorMessage, restoreRequiredVehicleFields, showErrorToast]);

  const closeVehicleModal = useCallback(() => {
    if (isSavingVehicle) {
      return;
    }

    setVehicleModalOpen(false);
  }, [isSavingVehicle]);

  const applyCreatedVehicleToState = useCallback((customerId: number, createdVehicle: VehicleDetailDto) => {
    setVehiclesByCustomerId((prev) => ({
      ...prev,
      [customerId]: [...(prev[customerId] ?? []), createdVehicle],
    }));

    setCustomers((prev) => prev.map((item) => (
      item.id === customerId
        ? { ...item, vehicleCount: item.vehicleCount + 1 }
        : item
    )));
  }, [setCustomers, setVehiclesByCustomerId]);

  const applyUpdatedVehicleToState = useCallback((
    customerId: number,
    vehicleId: number,
    payload: CreateVehicleRequest | UpdateVehicleRequest,
  ) => {
    setVehiclesByCustomerId((prev) => ({
      ...prev,
      [customerId]: (prev[customerId] ?? []).map((vehicle) => (
        vehicle.id === vehicleId
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
  }, [setVehiclesByCustomerId]);

  const reloadCachedHistoryIfNeeded = useCallback((customerId: number, vehicleId: number) => {
    if (customerHistoryByCustomerId[customerId]) {
      void loadCustomerHistory(customerId, true);
    }

    if (vehicleHistoryByVehicleId[vehicleId]) {
      void loadVehicleHistory(vehicleId, true);
    }
  }, [customerHistoryByCustomerId, loadCustomerHistory, loadVehicleHistory, vehicleHistoryByVehicleId]);

  const persistVehicleMutation = useCallback(async (
    customerId: number,
    payload: CreateVehicleRequest | UpdateVehicleRequest,
  ) => {
    if (vehicleModalMode === 'create') {
      const created = await customerRegistryService.createVehicle(customerId, payload);
      applyCreatedVehicleToState(customerId, created);
      showSuccessToast('customers.toasts.vehicleCreated');
      return;
    }

    if (editingVehicleId === null) {
      return;
    }

    await customerRegistryService.updateVehicle(editingVehicleId, payload);

    applyUpdatedVehicleToState(customerId, editingVehicleId, payload);
    reloadCachedHistoryIfNeeded(customerId, editingVehicleId);

    showSuccessToast('customers.toasts.vehicleUpdated');
  }, [
    applyCreatedVehicleToState,
    applyUpdatedVehicleToState,
    editingVehicleId,
    reloadCachedHistoryIfNeeded,
    showSuccessToast,
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
      handleSubmitVehicleError(error);
    } finally {
      setIsSavingVehicle(false);
    }
  }, [
    getFirstFieldErrorMessage,
    handleSubmitVehicleError,
    persistVehicleMutation,
    showErrorToast,
    vehicleForm,
    vehicleModalCustomerId,
  ]);

  return {
    vehicleModalOpen,
    vehicleModalMode,
    vehicleForm,
    setVehicleForm,
    isSavingVehicle,
    openCreateVehicleModal,
    openEditVehicleModal,
    closeVehicleModal,
    handleSubmitVehicle,
  };
}
