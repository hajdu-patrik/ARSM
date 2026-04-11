import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SchedulerCreateIntakeRequest, SchedulerCustomerLookupDto } from '../../../types/scheduler/scheduler.types';
import { appointmentService } from '../../../services/scheduler/appointment.service';
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
  type LookupState,
  type VehicleFormState,
  type VehicleMode,
  VEHICLE_NUMERIC_LIMITS,
} from '../components/intake/SchedulerIntakeModal.types';

interface UseSchedulerIntakeFormArgs {
  readonly isOpen: boolean;
  readonly selectedDate: Date;
  readonly onClose: () => void;
  readonly onSubmit: (request: SchedulerCreateIntakeRequest) => Promise<void>;
}

export function useSchedulerIntakeForm({
  isOpen,
  selectedDate,
  onClose,
  onSubmit,
}: UseSchedulerIntakeFormArgs) {
  const [lookupState, setLookupState] = useState<LookupState>('idle');
  const [customerLookup, setCustomerLookup] = useState<SchedulerCustomerLookupDto | null>(null);
  const [email, setEmail] = useState('');
  const [customerFirstName, setCustomerFirstName] = useState('');
  const [customerMiddleName, setCustomerMiddleName] = useState('');
  const [customerLastName, setCustomerLastName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [dueDateTime, setDueDateTime] = useState('');
  const [vehicleMode, setVehicleMode] = useState<VehicleMode>('existing');
  const [existingVehicleId, setExistingVehicleId] = useState('');
  const [vehicle, setVehicle] = useState<VehicleFormState>(EMPTY_VEHICLE);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setLookupState('idle');
    setCustomerLookup(null);
    setEmail('');
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
  }, [isOpen, selectedDate]);

  const shouldShowCustomerCreate = lookupState === 'not-found';
  const shouldShowVehicleCreate = lookupState === 'not-found' || vehicleMode === 'new';
  const customerHasVehicles = (customerLookup?.vehicles.length ?? 0) > 0;

  const handleLookup = useCallback(async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setErrorKey('scheduler.intake.errors.emailRequired');
      return;
    }

    setIsSearching(true);
    setErrorKey(null);

    try {
      const lookup = await appointmentService.findCustomerByEmail(normalizedEmail);
      if (lookup) {
        setLookupState('found');
        setCustomerLookup(lookup);
        setVehicleMode(lookup.vehicles.length > 0 ? 'existing' : 'new');
        setExistingVehicleId(lookup.vehicles[0]?.id ? String(lookup.vehicles[0].id) : '');
      } else {
        setLookupState('not-found');
        setCustomerLookup(null);
        setVehicleMode('new');
        setExistingVehicleId('');
      }
    } catch {
      setErrorKey('scheduler.intake.errors.searchFailed');
    } finally {
      setIsSearching(false);
    }
  }, [email]);

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
    const normalizedEmail = email.trim().toLowerCase();
    const autoScheduledDate = getDefaultScheduledDate(selectedDate);

    const validationError = getCreateValidationError({
      lookupState,
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
      lookupState,
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
    email,
    existingVehicleId,
    lookupState,
    onClose,
    onSubmit,
    selectedDate,
    shouldShowVehicleCreate,
    taskDescription,
    vehicle,
    vehicleMode,
  ]);

  const actions = useMemo(() => ({
    setEmail,
    setCustomerFirstName,
    setCustomerMiddleName,
    setCustomerLastName,
    setCustomerPhone,
    setTaskDescription,
    setDueDateTime,
    setVehicleMode,
    setExistingVehicleId,
    handleLookup,
    handleVehicleField,
    handleCreate,
  }), [handleCreate, handleLookup, handleVehicleField]);

  return {
    state: {
      lookupState,
      customerLookup,
      email,
      customerFirstName,
      customerMiddleName,
      customerLastName,
      customerPhone,
      taskDescription,
      dueDateTime,
      vehicleMode,
      existingVehicleId,
      vehicle,
      isSearching,
      isSubmitting,
      errorKey,
    },
    derived: {
      shouldShowCustomerCreate,
      shouldShowVehicleCreate,
      customerHasVehicles,
    },
    actions,
  };
}
