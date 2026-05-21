import type { CustomerListItem, VehicleDetailDto } from '../../../types/customers/customers.types';

/** Finds the current license plate for a vehicle before a local update/delete mutates cached state. */
export function prevVehicleLicensePlate(vehicles: VehicleDetailDto[], vehicleId: number): string | null {
  return vehicles.find((vehicle) => vehicle.id === vehicleId)?.licensePlate ?? null;
}

/** Reconciles customer summary counts and searchable plates after vehicles are loaded on demand. */
export function applyLoadedVehicleSummary(
  customer: CustomerListItem,
  customerId: number,
  vehicles: VehicleDetailDto[],
): CustomerListItem {
  if (customer.id !== customerId) {
    return customer;
  }

  return {
    ...customer,
    vehicleCount: vehicles.length,
    vehicleLicensePlates: vehicles.map((vehicle) => vehicle.licensePlate),
  };
}

/** Replaces a cached plate reference so customer search stays aligned after vehicle edits. */
export function replaceCustomerVehiclePlate(
  customer: CustomerListItem,
  customerId: number,
  previousPlate: string | null,
  nextPlate: string,
): CustomerListItem {
  if (customer.id !== customerId || previousPlate === null) {
    return customer;
  }

  return {
    ...customer,
    vehicleLicensePlates: customer.vehicleLicensePlates.map((plate) => (plate === previousPlate ? nextPlate : plate)),
  };
}

/** Removes a cached plate reference and decrements the customer vehicle summary after deletion. */
export function removeCustomerVehiclePlate(
  customer: CustomerListItem,
  customerId: number,
  deletedPlate: string | null,
): CustomerListItem {
  if (customer.id !== customerId) {
    return customer;
  }

  return {
    ...customer,
    vehicleCount: Math.max(0, customer.vehicleCount - 1),
    vehicleLicensePlates: deletedPlate === null
      ? customer.vehicleLicensePlates
      : customer.vehicleLicensePlates.filter((plate) => plate !== deletedPlate),
  };
}