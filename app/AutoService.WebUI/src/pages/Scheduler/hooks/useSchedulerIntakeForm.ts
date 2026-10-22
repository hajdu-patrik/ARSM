/** Manages intake modal form state: live customer lookup, vehicle mode switching, validation, and submission. */
import { useCallback, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import type { SchedulerCreateIntakeRequest } from '../../../types/scheduler/scheduler.types';
import { buildIntakeRequest, mapIntakeErrorToKey } from '../components/intake/SchedulerIntakeModal.helpers';
import { useSchedulerIntakeFields } from './useSchedulerIntakeFields';
import { useSchedulerIntakeLookup } from './useSchedulerIntakeLookup';

interface UseSchedulerIntakeFormArgs {
  readonly selectedDate: Date;
  readonly onClose: () => void;
  readonly onSubmit: (request: SchedulerCreateIntakeRequest) => Promise<void>;
}

/** Manages the full lifecycle of the scheduler intake form: field state, lookup, validation, and submission.
 * The form starts empty each time it mounts, so the modal mounts it only while it is open. */
export function useSchedulerIntakeForm({
  selectedDate,
  onClose,
  onSubmit,
}: UseSchedulerIntakeFormArgs) {
  const fields = useSchedulerIntakeFields(selectedDate);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const lookup = useSchedulerIntakeLookup({
    onLookupReset: fields.resetVehicleSelectionState,
    onLookupFound: fields.applyFoundLookupToVehicleState,
    setErrorKey,
  });
  const {
    handleEmailChange,
    handleLicensePlateLookupChange,
    handleNameLookupChange,
    handleSelectNameLookupResult,
  } = lookup.actions;
  const { lookupState, customerLookup, email } = lookup.state;
  const {
    customerFirstName,
    customerMiddleName,
    customerLastName,
    customerPhone,
    taskDescription,
    dueDateTime,
    vehicleMode,
    existingVehicleId,
    vehicle,
  } = fields;

  const { isPending: isSubmitting, mutate: submitIntake } = useMutation({
    mutationFn: onSubmit,
    onSuccess: () => {
      onClose();
    },
    onError: (error) => {
      setErrorKey(mapIntakeErrorToKey(error));
    },
  });

  const shouldShowCustomerCreate = lookupState === 'not-found';
  const shouldShowVehicleCreate = shouldShowCustomerCreate || (lookupState === 'found' && vehicleMode === 'new');
  const customerHasVehicles = (customerLookup?.vehicles.length ?? 0) > 0;
  const canCreateIntake = lookupState === 'found' || lookupState === 'not-found';

  const handleCreate = useCallback(() => {
    setErrorKey(null);

    const normalizedEmail = (lookupState === 'found' ? customerLookup?.email ?? email : email).trim().toLowerCase();
    const result = buildIntakeRequest({
      lookupState,
      normalizedEmail,
      dueDateTime,
      selectedDate,
      taskDescription,
      shouldShowVehicleCreate,
      vehicleMode,
      existingVehicleId,
      vehicle,
      customerFirstName,
      customerMiddleName,
      customerLastName,
      customerPhone,
    });

    if ('errorKey' in result) {
      setErrorKey(result.errorKey);
      return;
    }

    submitIntake(result.request);
  }, [
    customerFirstName,
    customerLastName,
    customerLookup,
    customerMiddleName,
    customerPhone,
    dueDateTime,
    email,
    existingVehicleId,
    lookupState,
    selectedDate,
    shouldShowVehicleCreate,
    submitIntake,
    taskDescription,
    vehicle,
    vehicleMode,
  ]);

  const {
    setCustomerFirstName,
    setCustomerMiddleName,
    setCustomerLastName,
    setCustomerPhone,
    setTaskDescription,
    setDueDateTime,
    setVehicleMode,
    setExistingVehicleId,
    handleVehicleField,
  } = fields;

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
    setCustomerFirstName,
    setCustomerLastName,
    setCustomerMiddleName,
    setCustomerPhone,
    setDueDateTime,
    setExistingVehicleId,
    setTaskDescription,
    setVehicleMode,
  ]);

  return {
    state: {
      ...lookup.state,
      customerFirstName,
      customerMiddleName,
      customerLastName,
      customerPhone,
      taskDescription,
      dueDateTime,
      vehicleMode,
      existingVehicleId,
      vehicle,
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
