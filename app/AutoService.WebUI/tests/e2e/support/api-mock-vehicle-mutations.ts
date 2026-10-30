/** Vehicle write mocks: field, VIN, plate and uniqueness checks and 404s answer like the API's vehicle handlers. */
import type { Route } from '@playwright/test';
import { DRIVETRAIN_TYPES } from '../../../src/types/customers/customers.types';
import type { CreateVehicleRequest } from '../../../src/types/customers/customers.types';
import type { InstallApiMockOptions } from './api-mocks';
import { CUSTOMER_NOT_FOUND, allVehicles, rejectWith, removeAppointments } from './api-mock-customer-mutations';
import { createVehicle } from './api-mock-data';
import { fulfillJson, fulfillNoContent } from './api-mock-response';
import type { MockApiState } from './test-data';

const VEHICLE_NOT_FOUND = 'Vehicle not found.';
const VEHICLE_REQUIRED = 'LicensePlate, Vin, Brand, Model, and DrivetrainType are required.';
const VIN_LENGTH = 17;

function normalizePlate(plate: string): string {
  return plate.trim().toUpperCase().replaceAll(/\s+/g, ' ');
}

/** The 422 detail of the first invalid vehicle field, in the order the API checks them. */
function vehicleFieldError(request: Partial<CreateVehicleRequest>): string | null {
  const { licensePlate, vin, brand, model, drivetrainType, year = 0, mileageKm = 0, enginePowerKw = 0 } = request;
  if (![licensePlate, vin, brand, model, drivetrainType].every((value) => (value ?? '').trim() !== '')) {
    return VEHICLE_REQUIRED;
  }

  if (year < 1886 || year > 2100) {
    return 'Year must be between 1886 and 2100.';
  }

  if (mileageKm < 0 || enginePowerKw < 0) {
    return 'MileageKm and EnginePowerKw must be non-negative.';
  }

  const trimmedVin = (vin ?? '').trim();
  if (trimmedVin.length !== VIN_LENGTH) {
    return `VIN must be exactly ${String(VIN_LENGTH)} characters.`;
  }

  if (!/^[0-9A-HJ-NPR-Z]+$/i.test(trimmedVin)) {
    return 'VIN may only contain digits and uppercase letters A-H, J-N, P, and R-Z.';
  }

  return DRIVETRAIN_TYPES.some((type) => type === drivetrainType?.trim()) ? null : 'DrivetrainType is invalid.';
}

function vehiclePlateError(plate: string): string | null {
  if (plate.length < 2 || plate.length > 20) {
    return 'License plate must be between 2 and 20 characters.';
  }

  return /\d/.test(plate) ? null : 'License plate must contain at least one digit.';
}

/** The 409 detail when another vehicle holds the plate or, checked second, the VIN. */
function vehicleConflict(state: MockApiState, plate: string, vin: string, excludeVehicleId: number | null): string | null {
  const others = allVehicles(state).filter((vehicle) => vehicle.id !== excludeVehicleId);
  if (others.some((vehicle) => normalizePlate(vehicle.licensePlate) === plate)) {
    return 'A vehicle with this license plate already exists.';
  }

  return others.some((vehicle) => vehicle.vin.toUpperCase() === vin) ? 'A vehicle with this VIN already exists.' : null;
}

function normalizedVehicleRequest(request: CreateVehicleRequest): CreateVehicleRequest {
  return {
    ...request,
    licensePlate: normalizePlate(request.licensePlate),
    vin: request.vin.trim().toUpperCase(),
    brand: request.brand.trim(),
    model: request.model.trim(),
  };
}

/** `POST /api/customers/{id}/vehicles`: field checks, then 404 for an unknown customer, plate checks and 409 conflicts. */
export async function handleCreateVehicle(route: Route, state: MockApiState, customerId: number): Promise<void> {
  const request = route.request().postDataJSON() as CreateVehicleRequest;
  const fieldError = vehicleFieldError(request);
  if (fieldError !== null) {
    await rejectWith(route, 422, fieldError);
    return;
  }

  if (!state.customers.some((customer) => customer.id === customerId)) {
    await rejectWith(route, 404, CUSTOMER_NOT_FOUND);
    return;
  }

  const normalized = normalizedVehicleRequest(request);
  const error = vehiclePlateError(normalized.licensePlate) ?? vehicleConflict(state, normalized.licensePlate, normalized.vin, null);
  if (error !== null) {
    await rejectWith(route, error.includes('already exists') ? 409 : 422, error);
    return;
  }

  await fulfillJson(route, createVehicle(state, customerId, normalized), 201);
}

/** `PUT /api/vehicles/{id}`: field checks, 404 for an unknown vehicle, plate checks and 409 conflicts. */
export async function handleUpdateVehicle(route: Route, state: MockApiState, vehicleId: number): Promise<void> {
  const request = route.request().postDataJSON() as CreateVehicleRequest;
  const fieldError = vehicleFieldError(request);
  if (fieldError !== null) {
    await rejectWith(route, 422, fieldError);
    return;
  }

  const vehicle = allVehicles(state).find((item) => item.id === vehicleId);
  if (vehicle === undefined) {
    await rejectWith(route, 404, VEHICLE_NOT_FOUND);
    return;
  }

  const normalized = normalizedVehicleRequest(request);
  const error = vehiclePlateError(normalized.licensePlate) ?? vehicleConflict(state, normalized.licensePlate, normalized.vin, vehicleId);
  if (error !== null) {
    await rejectWith(route, error.includes('already exists') ? 409 : 422, error);
    return;
  }

  const owner = state.customers.find((customer) => customer.id === vehicle.customer.id);
  if (owner !== undefined) {
    owner.vehicleLicensePlates = owner.vehicleLicensePlates.map((plate) => (plate === vehicle.licensePlate ? normalized.licensePlate : plate));
  }
  Object.assign(vehicle, normalized);
  await fulfillNoContent(route);
}

/** `DELETE /api/vehicles/{id}`: admin only; removes the vehicle with its history and appointments. */
export async function handleDeleteVehicle(
  route: Route,
  state: MockApiState,
  options: InstallApiMockOptions,
  vehicleId: number,
): Promise<void> {
  if (options.isAdmin !== true) {
    await rejectWith(route, 403, 'Forbidden');
    return;
  }

  const vehicle = allVehicles(state).find((item) => item.id === vehicleId);
  if (vehicle === undefined) {
    await rejectWith(route, 404, VEHICLE_NOT_FOUND);
    return;
  }

  const customerId = vehicle.customer.id;
  state.vehiclesByCustomerId[customerId] = (state.vehiclesByCustomerId[customerId] ?? []).filter((item) => item.id !== vehicleId);
  Reflect.deleteProperty(state.vehicleHistoryByVehicleId, vehicleId);
  const owner = state.customers.find((customer) => customer.id === customerId);
  if (owner !== undefined) {
    owner.vehicleCount -= 1;
    owner.vehicleLicensePlates = owner.vehicleLicensePlates.filter((plate) => plate !== vehicle.licensePlate);
  }
  removeAppointments(state, (id) => id === vehicleId);
  await fulfillNoContent(route);
}
