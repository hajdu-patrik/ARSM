/** Vehicle create/update mutation hook: modal state, payload validation, server calls, and cache refresh. */
import { useCallback, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  getFirstFieldErrorMessage,
  hasServerFieldErrors,
  type ServerFieldErrors,
} from '../../../utils/serverValidation';
import type {
  CreateVehicleRequest,
  UpdateVehicleRequest,
  VehicleDetailDto,
} from '../../../types/customers/customers.types';
import { customerRegistryService } from '../../../services/customers/customer-registry.service';
import {
  VEHICLE_FIELD_NAMES,
  VEHICLE_MESSAGE_FIELDS,
  currentFieldErrors,
  pinFieldErrors,
  resolveRejectedSave,
  restoreRequiredFields,
  type PinnedFieldErrors,
  type SaveErrorRules,
  type VehicleFieldName,
} from '../fieldErrors';
import {
  buildVehicleNumericFieldErrors,
  mapVehicleValidationMessageToKey,
  parseVehicleNumericValues,
  type VehicleFormState,
} from '../helpers';
import { TOAST_KEY_NO_CHANGES } from '../../../store/toast.keys';
import type { VehicleModalMode } from '../page.types';
import type { CustomerMutationToastHandlersWithWarning } from './mutation-toast.types';
import {
  buildVehiclePayload,
  hasAnyVehicleFieldValue,
  hasRequiredVehicleFields,
  hasVehicleUpdateChanges,
} from './vehicleMutation.helpers';

const EMPTY_VEHICLE_FORM: VehicleFormState = {
  licensePlate: '',
  vin: '',
  brand: '',
  model: '',
  year: '',
  mileageKm: '',
  enginePowerKw: '',
  drivetrainType: '',
};

/** How a rejected vehicle save maps to a toast and pinned field errors. */
const VEHICLE_SAVE_ERROR_RULES: SaveErrorRules<VehicleFieldName> = {
  mapMessage: mapVehicleValidationMessageToKey,
  fallbackKey: 'customers.errors.vehicleSaveFailed',
  fields: VEHICLE_FIELD_NAMES,
  messageFields: VEHICLE_MESSAGE_FIELDS,
};

/** Required vehicle text fields an edit restores from the saved vehicle when the server rejects them blank. */
const REQUIRED_VEHICLE_TEXT_FIELDS = ['licensePlate', 'vin', 'brand', 'model', 'drivetrainType'] as const;

/** Variables of the vehicle create mutation. */
interface CreateVehicleVariables {
  readonly customerId: number;
  readonly request: CreateVehicleRequest;
}

/** Variables of the vehicle update mutation; the customer id only scopes the cache refresh. */
interface UpdateVehicleVariables {
  readonly customerId: number;
  readonly vehicleId: number;
  readonly request: UpdateVehicleRequest;
}

/** Dependencies required by vehicle create/edit mutation handlers. */
interface UseVehicleFormMutationsParams extends CustomerMutationToastHandlersWithWarning {
  refreshAfterVehicleCreated: (customerId: number) => Promise<void>;
  refreshAfterVehicleUpdated: (customerId: number, vehicleId: number) => Promise<void>;
}

/** Manages vehicle form modal state and create/update mutations. */
export function useVehicleFormMutations({
  showSuccessToast,
  showErrorToast,
  showWarningToast,
  refreshAfterVehicleCreated,
  refreshAfterVehicleUpdated,
}: UseVehicleFormMutationsParams) {
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [vehicleModalMode, setVehicleModalMode] = useState<VehicleModalMode>('create');
  const [vehicleModalCustomerId, setVehicleModalCustomerId] = useState<number | null>(null);
  const [editingVehicleId, setEditingVehicleId] = useState<number | null>(null);
  const [editingVehicleSnapshot, setEditingVehicleSnapshot] = useState<VehicleDetailDto | null>(null);
  const [vehicleForm, setVehicleForm] = useState<VehicleFormState>(EMPTY_VEHICLE_FORM);
  const [pinnedFieldErrors, setPinnedFieldErrors] = useState<PinnedFieldErrors<VehicleFieldName>>({});

  const vehicleFieldErrors = currentFieldErrors(pinnedFieldErrors, vehicleForm, VEHICLE_FIELD_NAMES);
  const vehiclePayloadResult = hasRequiredVehicleFields(vehicleForm) ? buildVehiclePayload(vehicleForm) : null;
  const validVehiclePayload = vehiclePayloadResult?.payload ?? null;

  const openCreateVehicleModal = useCallback((customerId: number) => {
    setVehicleModalMode('create');
    setVehicleModalCustomerId(customerId);
    setEditingVehicleId(null);
    setEditingVehicleSnapshot(null);
    setVehicleForm(EMPTY_VEHICLE_FORM);
    setPinnedFieldErrors({});
    setVehicleModalOpen(true);
  }, []);

  const openEditVehicleModal = useCallback((customerId: number, vehicle: VehicleDetailDto) => {
    setVehicleModalMode('edit');
    setVehicleModalCustomerId(customerId);
    setEditingVehicleId(vehicle.id);
    setEditingVehicleSnapshot(vehicle);
    setVehicleForm({
      licensePlate: vehicle.licensePlate,
      vin: vehicle.vin,
      brand: vehicle.brand,
      model: vehicle.model,
      year: String(vehicle.year),
      mileageKm: String(vehicle.mileageKm),
      enginePowerKw: String(vehicle.enginePowerKw),
      drivetrainType: vehicle.drivetrainType,
    });
    setPinnedFieldErrors({});
    setVehicleModalOpen(true);
  }, []);

  const restoreRequiredVehicleFields = useCallback((errors: ServerFieldErrors) => {
    if (vehicleModalMode !== 'edit' || !editingVehicleSnapshot) {
      return;
    }

    setVehicleForm((prev) => restoreRequiredFields(prev, editingVehicleSnapshot, errors, REQUIRED_VEHICLE_TEXT_FIELDS));
  }, [editingVehicleSnapshot, vehicleModalMode]);

  const handleSubmitVehicleError = useCallback((error: unknown) => {
    const rejected = resolveRejectedSave(error, VEHICLE_SAVE_ERROR_RULES, vehicleForm);

    if (rejected.fieldErrors !== null) {
      restoreRequiredVehicleFields(rejected.fieldErrors);
    }

    if (rejected.pinned !== null) {
      setPinnedFieldErrors(rejected.pinned);
    }

    showErrorToast(rejected.messageKey);
  }, [restoreRequiredVehicleFields, showErrorToast, vehicleForm]);

  const { mutate: createVehicle, isPending: isCreatingVehicle } = useMutation({
    mutationFn: ({ customerId, request }: CreateVehicleVariables) => (
      customerRegistryService.createVehicle(customerId, request)
    ),
    onSuccess: async (_created, { customerId }) => {
      await refreshAfterVehicleCreated(customerId);
      showSuccessToast('customers.toasts.vehicleCreated');
      setVehicleModalOpen(false);
    },
    onError: handleSubmitVehicleError,
  });

  const { mutate: updateVehicle, isPending: isUpdatingVehicle } = useMutation({
    mutationFn: ({ vehicleId, request }: UpdateVehicleVariables) => (
      customerRegistryService.updateVehicle(vehicleId, request)
    ),
    onSuccess: async (_result, { customerId, vehicleId }) => {
      await refreshAfterVehicleUpdated(customerId, vehicleId);
      showSuccessToast('customers.toasts.vehicleUpdated');
      setVehicleModalOpen(false);
    },
    onError: handleSubmitVehicleError,
  });

  const isSavingVehicle = isCreatingVehicle || isUpdatingVehicle;
  const isVehicleSaveEnabled = validVehiclePayload !== null
    && (
      vehicleModalMode === 'create'
        ? hasAnyVehicleFieldValue(vehicleForm)
        : Boolean(editingVehicleSnapshot && hasVehicleUpdateChanges(editingVehicleSnapshot, validVehiclePayload))
    )
    && !isSavingVehicle;

  const closeVehicleModal = useCallback(() => {
    if (isSavingVehicle) {
      return;
    }

    setVehicleModalOpen(false);
  }, [isSavingVehicle]);

  const handleSubmitVehicle = useCallback((event: React.SyntheticEvent) => {
    event.preventDefault();

    if (vehicleModalCustomerId === null) {
      return;
    }

    const numericFieldErrors = buildVehicleNumericFieldErrors(parseVehicleNumericValues(vehicleForm));

    if (hasServerFieldErrors(numericFieldErrors)) {
      setPinnedFieldErrors(pinFieldErrors(numericFieldErrors, vehicleForm, VEHICLE_FIELD_NAMES));
      showErrorToast(getFirstFieldErrorMessage(numericFieldErrors) ?? 'customers.errors.vehicleSaveFailed');
      return;
    }

    const payloadResult = buildVehiclePayload(vehicleForm);

    if (payloadResult.fieldError !== null) {
      showErrorToast(payloadResult.fieldError);
      return;
    }

    const { payload } = payloadResult;

    if (vehicleModalMode === 'create') {
      createVehicle({ customerId: vehicleModalCustomerId, request: payload });
      return;
    }

    if (editingVehicleId === null) {
      return;
    }

    if (editingVehicleSnapshot && !hasVehicleUpdateChanges(editingVehicleSnapshot, payload)) {
      showWarningToast(TOAST_KEY_NO_CHANGES);
      return;
    }

    updateVehicle({ customerId: vehicleModalCustomerId, vehicleId: editingVehicleId, request: payload });
  }, [
    createVehicle,
    editingVehicleId,
    editingVehicleSnapshot,
    showErrorToast,
    showWarningToast,
    updateVehicle,
    vehicleForm,
    vehicleModalCustomerId,
    vehicleModalMode,
  ]);

  return {
    vehicleModalOpen,
    vehicleModalMode,
    vehicleForm,
    setVehicleForm,
    vehicleFieldErrors,
    isSavingVehicle,
    isVehicleSaveEnabled,
    openCreateVehicleModal,
    openEditVehicleModal,
    closeVehicleModal,
    handleSubmitVehicle,
  };
}
