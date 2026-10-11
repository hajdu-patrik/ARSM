/** Plain field state of the scheduler intake form: customer identity, task, due moment and vehicle. */
import { useCallback, useState } from 'react';
import type { SchedulerCustomerLookupDto } from '../../../types/scheduler/scheduler.types';
import {
  getDefaultDueDate,
  isRangedVehicleField,
  normalizeRangedNumberInput,
} from '../components/intake/SchedulerIntakeModal.helpers';
import {
  EMPTY_VEHICLE,
  type VehicleFormState,
  type VehicleMode,
  VEHICLE_NUMERIC_LIMITS,
} from '../components/intake/SchedulerIntakeModal.types';

/** Owns the intake form fields; the due moment starts at the default for the selected day. */
export function useSchedulerIntakeFields(selectedDate: Date) {
  const [customerFirstName, setCustomerFirstName] = useState('');
  const [customerMiddleName, setCustomerMiddleName] = useState('');
  const [customerLastName, setCustomerLastName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [dueDateTime, setDueDateTime] = useState(() => getDefaultDueDate(selectedDate));
  const [vehicleMode, setVehicleMode] = useState<VehicleMode>('existing');
  const [existingVehicleId, setExistingVehicleId] = useState('');
  const [vehicle, setVehicle] = useState<VehicleFormState>(EMPTY_VEHICLE);

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

  const handleVehicleField = useCallback((field: keyof VehicleFormState, value: string) => {
    if (isRangedVehicleField(field)) {
      const { min, max } = VEHICLE_NUMERIC_LIMITS[field];
      setVehicle((previous) => ({
        ...previous,
        [field]: normalizeRangedNumberInput(value, min, max),
      }));
      return;
    }

    setVehicle((previous) => ({
      ...previous,
      [field]: value,
    }));
  }, []);

  return {
    customerFirstName,
    customerMiddleName,
    customerLastName,
    customerPhone,
    taskDescription,
    dueDateTime,
    vehicleMode,
    existingVehicleId,
    vehicle,
    setCustomerFirstName,
    setCustomerMiddleName,
    setCustomerLastName,
    setCustomerPhone,
    setTaskDescription,
    setDueDateTime,
    setVehicleMode,
    setExistingVehicleId,
    resetVehicleSelectionState,
    applyFoundLookupToVehicleState,
    handleVehicleField,
  };
}
