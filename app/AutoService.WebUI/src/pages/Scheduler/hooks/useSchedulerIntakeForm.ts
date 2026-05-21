/**
 * Hook that manages the intake modal form state, live customer lookup,
 * vehicle mode switching, and intake creation submission.
 *
 * Resets all fields when the modal opens, performs live name/license-plate
 * lookup, derives vehicle create/existing mode, validates the form
 * before submission, and maps backend errors to i18n keys.
 *
 * @module useSchedulerIntakeForm
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SchedulerCreateIntakeRequest, SchedulerCustomerLookupDto } from '../../../types/scheduler/scheduler.types';
import {
  enrichPayloadByLookupState,
  getCreateValidationError,
  getDefaultDueDate,
  getDefaultScheduledDate,
  mapIntakeErrorToKey,
  normalizeRangedNumberInput,
  toIso,
} from '../components/intake/SchedulerIntakeModal.helpers';
import {
  EMPTY_VEHICLE,
  type VehicleFormState,
  type VehicleMode,
  VEHICLE_NUMERIC_LIMITS,
} from '../components/intake/SchedulerIntakeModal.types';
import { useSchedulerIntakeLookup } from './useSchedulerIntakeLookup';

/** Configuration for {@link useSchedulerIntakeForm}. */
interface UseSchedulerIntakeFormArgs {
  /** Whether the intake modal is currently visible. */
  readonly isOpen: boolean;
  /** The calendar day selected for the new appointment. */
  readonly selectedDate: Date;
  /** Callback to close the intake modal on successful submission. */
  readonly onClose: () => void;
  /** Submits the built intake request to the backend via the parent page. */
  readonly onSubmit: (request: SchedulerCreateIntakeRequest) => Promise<void>;
}

/**
 * Manages the full lifecycle of the scheduler intake form: field state,
 * customer lookup, vehicle field handling, validation, and submission.
 *
 * @returns `state` (all field values and loading flags), `derived`
 *          (computed booleans for conditional UI), and `actions`
 *          (memoized callbacks for field changes and form operations).
 */
export function useSchedulerIntakeForm({
  isOpen,
  selectedDate,
  onClose,
  onSubmit,
}: UseSchedulerIntakeFormArgs) {
  const [customerFirstName, setCustomerFirstName] = useState('');
  const [customerMiddleName, setCustomerMiddleName] = useState('');
  const [customerLastName, setCustomerLastName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [dueDateTime, setDueDateTime] = useState('');
  const [vehicleMode, setVehicleMode] = useState<VehicleMode>('existing');
  const [existingVehicleId, setExistingVehicleId] = useState('');
  const [vehicle, setVehicle] = useState<VehicleFormState>(EMPTY_VEHICLE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const resetVehicleSelectionState = useCallback(() => {
    setVehicleMode('existing');
    setExistingVehicleId('');
    setTaskDescription('');
  }, []);

  const applyFoundLookupToVehicleState = useCallback((lookup: SchedulerCustomerLookupDto) => {
    const matchedVehicleId = lookup.matchedVehicleId ?? lookup.vehicles[0]?.id ?? null;

    setVehicleMode(lookup.vehicles.length > 0 ? 'existing' : 'new');
    setExistingVehicleId(matchedVehicleId ? String(matchedVehicleId) : '');
  }, []);

  const lookup = useSchedulerIntakeLookup({
    onLookupReset: resetVehicleSelectionState,
    onLookupFound: applyFoundLookupToVehicleState,
    setErrorKey,
  });
  const {
    handleEmailChange,
    handleLicensePlateLookupChange,
    handleNameLookupChange,
    handleSelectNameLookupResult,
    resetLookupForm,
  } = lookup.actions;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    resetLookupForm();
    setCustomerFirstName('');
    setCustomerMiddleName('');
    setCustomerLastName('');
    setCustomerPhone('');
    setTaskDescription('');
    setVehicleMode('existing');
    setExistingVehicleId('');
    setVehicle(EMPTY_VEHICLE);
    setErrorKey(null);
    setDueDateTime(getDefaultDueDate(selectedDate));
  }, [isOpen, resetLookupForm, selectedDate]);

  const shouldShowCustomerCreate = lookup.state.lookupState === 'not-found';
  const shouldShowVehicleCreate = shouldShowCustomerCreate || (lookup.state.lookupState === 'found' && vehicleMode === 'new');
  const customerHasVehicles = (lookup.state.customerLookup?.vehicles.length ?? 0) > 0;
  const canCreateIntake = lookup.state.lookupState === 'found' || lookup.state.lookupState === 'not-found';

  const handleVehicleField = useCallback((field: keyof VehicleFormState, value: string) => {
    if (field in VEHICLE_NUMERIC_LIMITS) {
      const limits = VEHICLE_NUMERIC_LIMITS[field as keyof typeof VEHICLE_NUMERIC_LIMITS];
      setVehicle((prev) => ({
        ...prev,
        [field]: normalizeRangedNumberInput(value, limits.min, limits.max),
      }));
      return;
    }

    setVehicle((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const handleCreate = useCallback(async () => {
    setErrorKey(null);

    const normalizedEmail = (
      lookup.state.lookupState === 'found'
        ? lookup.state.customerLookup?.email ?? lookup.state.email
        : lookup.state.email
    ).trim().toLowerCase();
    const autoScheduledDate = getDefaultScheduledDate(selectedDate);

    const validationError = getCreateValidationError({
      lookupState: lookup.state.lookupState,
      normalizedEmail,
      dueDateTime,
      selectedDate,
      autoScheduledDate,
      taskDescription,
      shouldShowVehicleCreate,
      vehicle,
    });
    if (validationError) {
      setErrorKey(validationError);
      return;
    }

    const basePayload: SchedulerCreateIntakeRequest = {
      customerEmail: normalizedEmail,
      scheduledDate: toIso(autoScheduledDate),
      dueDateTime: toIso(dueDateTime),
      taskDescription: taskDescription.trim(),
    };

    const payloadError = enrichPayloadByLookupState({
      basePayload,
      lookupState: lookup.state.lookupState,
      vehicleMode,
      existingVehicleId,
      vehicle,
      customerFirstName,
      customerMiddleName,
      customerLastName,
      customerPhone,
    });
    if (payloadError) {
      setErrorKey(payloadError);
      return;
    }

    setIsSubmitting(true);
    setErrorKey(null);

    try {
      await onSubmit(basePayload);
      onClose();
    } catch (error) {
      setErrorKey(mapIntakeErrorToKey(error));
    } finally {
      setIsSubmitting(false);
    }
  }, [
    customerFirstName,
    customerLastName,
    customerMiddleName,
    customerPhone,
    dueDateTime,
    lookup.state.email,
    lookup.state.lookupState,
    existingVehicleId,
    onClose,
    onSubmit,
    selectedDate,
    shouldShowVehicleCreate,
    taskDescription,
    vehicle,
    vehicleMode,
  ]);

  const actions = useMemo(() => ({
    handleEmailChange,
    handleLicensePlateLookupChange,
    handleNameLookupChange,
    setCustomerFirstName,
    setCustomerMiddleName,
    setCustomerLastName,
    setCustomerPhone,
    setTaskDescription,
    setDueDateTime,
    setVehicleMode,
    setExistingVehicleId,
    handleSelectNameLookupResult,
    handleVehicleField,
    handleCreate,
  }), [
    handleCreate,
    handleEmailChange,
    handleVehicleField,
    handleLicensePlateLookupChange,
    handleNameLookupChange,
    handleSelectNameLookupResult,
  ]);

  return {
    state: {
      lookupMode: lookup.state.lookupMode,
      lookupState: lookup.state.lookupState,
      customerLookup: lookup.state.customerLookup,
      nameLookupResults: lookup.state.nameLookupResults,
      email: lookup.state.email,
      licensePlateLookup: lookup.state.licensePlateLookup,
      nameLookup: lookup.state.nameLookup,
      customerFirstName,
      customerMiddleName,
      customerLastName,
      customerPhone,
      taskDescription,
      dueDateTime,
      vehicleMode,
      existingVehicleId,
      vehicle,
      isSearching: lookup.state.isSearching,
      isSubmitting,
      errorKey,
    },
    derived: {
      shouldShowCustomerCreate,
      shouldShowVehicleCreate,
      customerHasVehicles,
      canCreateIntake,
    },
    actions,
  };
}
