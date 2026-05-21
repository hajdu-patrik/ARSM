import { useCallback, type Dispatch, type SetStateAction } from 'react';
import type { AppointmentDto } from '../../../types/scheduler/scheduler.types';
import type { CustomerListItem, DrivetrainType, VehicleDetailDto } from '../../../types/customers/customers.types';
import {
  prevVehicleLicensePlate,
  removeCustomerVehiclePlate,
  replaceCustomerVehiclePlate,
} from './useCustomersListState.helpers';

interface CustomerMutationPayload {
  firstName: string;
  middleName?: string | null;
  lastName: string;
  email: string;
  phoneNumber?: string | null;
}

interface VehicleMutationPayload {
  licensePlate: string;
  vin: string;
  brand: string;
  model: string;
  year: number;
  mileageKm: number;
  enginePowerKw: number;
  drivetrainType: DrivetrainType;
}

interface UseCustomersListMutationsParams {
  readonly setCustomers: Dispatch<SetStateAction<CustomerListItem[]>>;
  readonly setVehiclesByCustomerId: Dispatch<SetStateAction<Record<number, VehicleDetailDto[]>>>;
  readonly setCustomerHistoryByCustomerId: Dispatch<SetStateAction<Record<number, AppointmentDto[]>>>;
  readonly setVehicleHistoryByVehicleId: Dispatch<SetStateAction<Record<number, AppointmentDto[]>>>;
  readonly setExpandedCustomerIds: Dispatch<SetStateAction<Set<number>>>;
  readonly vehiclesByCustomerId: Record<number, VehicleDetailDto[]>;
}

/** Builds local cache update actions for customer and vehicle mutations. */
export function useCustomersListMutations({
  setCustomers,
  setVehiclesByCustomerId,
  setCustomerHistoryByCustomerId,
  setVehicleHistoryByVehicleId,
  setExpandedCustomerIds,
  vehiclesByCustomerId,
}: UseCustomersListMutationsParams) {
  const applyCustomerCreated = useCallback((createdCustomer: CustomerListItem) => {
    setCustomers((prev) => [...prev, createdCustomer]);
  }, [setCustomers]);

  const applyCustomerUpdated = useCallback((customerId: number, payload: CustomerMutationPayload) => {
    setCustomers((prev) => prev.map((item) => (
      item.id === customerId
        ? {
          ...item,
          firstName: payload.firstName,
          middleName: payload.middleName ?? null,
          lastName: payload.lastName,
          email: payload.email,
          phoneNumber: payload.phoneNumber ?? null,
        }
        : item
    )));
  }, [setCustomers]);

  const applyCustomerDeleted = useCallback((customerId: number) => {
    setCustomers((prev) => prev.filter((item) => item.id !== customerId));
    setVehiclesByCustomerId((prev) => {
      const next = { ...prev };
      delete next[customerId];
      return next;
    });
    setCustomerHistoryByCustomerId((prev) => {
      const next = { ...prev };
      delete next[customerId];
      return next;
    });
    setExpandedCustomerIds((prev) => {
      const next = new Set(prev);
      next.delete(customerId);
      return next;
    });
  }, [setCustomerHistoryByCustomerId, setCustomers, setExpandedCustomerIds, setVehiclesByCustomerId]);

  const applyVehicleCreated = useCallback((customerId: number, createdVehicle: VehicleDetailDto) => {
    setVehiclesByCustomerId((prev) => ({
      ...prev,
      [customerId]: [...(prev[customerId] ?? []), createdVehicle],
    }));

    setCustomers((prev) => prev.map((item) => (
      item.id === customerId
        ? {
          ...item,
          vehicleCount: item.vehicleCount + 1,
          vehicleLicensePlates: [...item.vehicleLicensePlates, createdVehicle.licensePlate],
        }
        : item
    )));
  }, [setCustomers, setVehiclesByCustomerId]);

  const applyVehicleUpdated = useCallback((customerId: number, vehicleId: number, payload: VehicleMutationPayload) => {
    setVehiclesByCustomerId((prev) => ({
      ...prev,
      [customerId]: (prev[customerId] ?? []).map((vehicle) => (
        vehicle.id === vehicleId
          ? {
            ...vehicle,
            licensePlate: payload.licensePlate,
            vin: payload.vin,
            brand: payload.brand,
            model: payload.model,
            year: payload.year,
            mileageKm: payload.mileageKm,
            enginePowerKw: payload.enginePowerKw,
            drivetrainType: payload.drivetrainType,
          }
          : vehicle
      )),
    }));

    const previousPlate = prevVehicleLicensePlate(vehiclesByCustomerId[customerId] ?? [], vehicleId);
    setCustomers((prev) => prev.map((item) => replaceCustomerVehiclePlate(item, customerId, previousPlate, payload.licensePlate)));
  }, [setCustomers, setVehiclesByCustomerId, vehiclesByCustomerId]);

  const applyVehicleDeleted = useCallback((customerId: number, vehicleId: number) => {
    const deletedPlate = prevVehicleLicensePlate(vehiclesByCustomerId[customerId] ?? [], vehicleId);

    setVehiclesByCustomerId((prev) => ({
      ...prev,
      [customerId]: (prev[customerId] ?? []).filter((vehicle) => vehicle.id !== vehicleId),
    }));

    setCustomers((prev) => prev.map((item) => removeCustomerVehiclePlate(item, customerId, deletedPlate)));

    setVehicleHistoryByVehicleId((prev) => {
      const next = { ...prev };
      delete next[vehicleId];
      return next;
    });
  }, [setCustomers, setVehicleHistoryByVehicleId, setVehiclesByCustomerId, vehiclesByCustomerId]);

  return {
    applyCustomerCreated,
    applyCustomerUpdated,
    applyCustomerDeleted,
    applyVehicleCreated,
    applyVehicleUpdated,
    applyVehicleDeleted,
  };
}