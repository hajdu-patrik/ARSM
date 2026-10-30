/** Customer write mocks: validation, uniqueness and 404 answer like the API customer handlers. */
import type { Route } from '@playwright/test';
import type { CreateCustomerRequest, CustomerListItem, VehicleDetailDto } from '../../../src/types/customers/customers.types';
import type { InstallApiMockOptions } from './api-mocks';
import { fulfillJson, fulfillNoContent } from './api-mock-response';
import type { MockApiState } from './test-data';

const CUSTOMER_REQUIRED = 'FirstName, LastName, and Email are required.';
const INVALID_EMAIL = 'Email must be a valid email address.';
const INVALID_PHONE = 'Phone number must be a valid European number.';
const EMAIL_EXISTS = 'A person with this email already exists.';
const PHONE_EXISTS = 'A person with this phone number already exists.';
export const CUSTOMER_NOT_FOUND = 'Customer not found.';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FIRST_CREATED_CUSTOMER_ID = 5000;

interface CustomerInput {
  readonly firstName: string;
  readonly middleName: string | null;
  readonly lastName: string;
  readonly email: string;
  readonly phoneNumber: string | null;
}

interface PersonContact {
  readonly email: string;
  readonly phoneNumber: string | null;
}

function readCustomerInput(request: Partial<CreateCustomerRequest>): CustomerInput {
  return {
    firstName: request.firstName?.trim() ?? '',
    middleName: request.middleName?.trim() || null,
    lastName: request.lastName?.trim() ?? '',
    email: request.email?.trim().toLowerCase() ?? '',
    phoneNumber: request.phoneNumber?.trim() || null,
  };
}

function digitsOf(value: string): string {
  return value.replaceAll(/\D/g, '');
}

function isValidPhone(phone: string): boolean {
  const digits = digitsOf(phone).length;
  return /^[+\d\s()-]+$/.test(phone) && digits >= 7 && digits <= 15;
}

/** The 422 detail of a missing name or e-mail, which the API checks before it looks the customer up. */
function requiredCustomerError(input: CustomerInput): string | null {
  return input.firstName && input.lastName && input.email ? null : CUSTOMER_REQUIRED;
}

/** The 422 detail of an invalid e-mail or, checked second, phone. */
function contactError(input: CustomerInput): string | null {
  if (!EMAIL_PATTERN.test(input.email)) {
    return INVALID_EMAIL;
  }

  return input.phoneNumber !== null && !isValidPhone(input.phoneNumber) ? INVALID_PHONE : null;
}

/** The 409 detail when another person (customer or mechanic) already holds the e-mail or, checked second, the phone. */
function contactConflict(state: MockApiState, input: CustomerInput, excludeCustomerId: number | null): string | null {
  const people: readonly PersonContact[] = [
    ...state.customers.filter((customer) => customer.id !== excludeCustomerId),
    ...state.mechanics,
  ];

  if (people.some((person) => person.email.toLowerCase() === input.email)) {
    return EMAIL_EXISTS;
  }

  const phoneDigits = input.phoneNumber === null ? '' : digitsOf(input.phoneNumber);
  const isPhoneTaken = phoneDigits !== '' && people.some((person) => person.phoneNumber !== null && digitsOf(person.phoneNumber) === phoneDigits);
  return isPhoneTaken ? PHONE_EXISTS : null;
}

export async function rejectWith(route: Route, status: number, detail: string): Promise<void> {
  await fulfillJson(route, { detail }, status);
}

/** `POST /api/customers`: 422 for a missing or invalid field, 409 for a taken e-mail or phone, else 201 with the new row. */
export async function handleCreateCustomer(route: Route, state: MockApiState): Promise<void> {
  const input = readCustomerInput(route.request().postDataJSON() as Partial<CreateCustomerRequest>);
  const error = requiredCustomerError(input) ?? contactError(input);
  if (error !== null) {
    await rejectWith(route, 422, error);
    return;
  }

  const conflict = contactConflict(state, input, null);
  if (conflict !== null) {
    await rejectWith(route, 409, conflict);
    return;
  }

  const highestId = Math.max(FIRST_CREATED_CUSTOMER_ID - 1, ...state.customers.map((customer) => customer.id));
  const created: CustomerListItem = { id: highestId + 1, ...input, vehicleCount: 0, vehicleLicensePlates: [] };
  state.customers.push(created);
  await fulfillJson(route, created, 201);
}

/** `PUT /api/customers/{id}`: the same checks, with a 404 for an unknown customer before the contact checks. */
export async function handleUpdateCustomer(route: Route, state: MockApiState, customerId: number): Promise<void> {
  const input = readCustomerInput(route.request().postDataJSON() as Partial<CreateCustomerRequest>);
  const requiredError = requiredCustomerError(input);
  if (requiredError !== null) {
    await rejectWith(route, 422, requiredError);
    return;
  }

  const customer = state.customers.find((item) => item.id === customerId);
  if (customer === undefined) {
    await rejectWith(route, 404, CUSTOMER_NOT_FOUND);
    return;
  }

  const error = contactError(input);
  if (error !== null) {
    await rejectWith(route, 422, error);
    return;
  }

  const conflict = contactConflict(state, input, customerId);
  if (conflict !== null) {
    await rejectWith(route, 409, conflict);
    return;
  }

  Object.assign(customer, input);
  await fulfillNoContent(route);
}

/** `DELETE /api/customers/{id}`: admin only; removes the customer with its vehicles, histories and appointments. */
export async function handleDeleteCustomer(
  route: Route,
  state: MockApiState,
  options: InstallApiMockOptions,
  customerId: number,
): Promise<void> {
  if (options.isAdmin !== true) {
    await rejectWith(route, 403, 'Forbidden');
    return;
  }

  const index = state.customers.findIndex((item) => item.id === customerId);
  if (index < 0) {
    await rejectWith(route, 404, CUSTOMER_NOT_FOUND);
    return;
  }

  state.customers.splice(index, 1);
  const removedVehicleIds = new Set((state.vehiclesByCustomerId[customerId] ?? []).map((vehicle) => vehicle.id));
  for (const vehicleId of removedVehicleIds) {
    Reflect.deleteProperty(state.vehicleHistoryByVehicleId, vehicleId);
  }
  Reflect.deleteProperty(state.vehiclesByCustomerId, customerId);
  Reflect.deleteProperty(state.customerHistoryByCustomerId, customerId);
  removeAppointments(state, (vehicleId) => removedVehicleIds.has(vehicleId));
  await fulfillNoContent(route);
}

export function allVehicles(state: MockApiState): VehicleDetailDto[] {
  return Object.values(state.vehiclesByCustomerId).flat();
}

/** Removes the appointments whose vehicle the predicate says is gone. */
export function removeAppointments(state: MockApiState, isGone: (vehicleId: number) => boolean): void {
  for (let index = state.appointments.length - 1; index >= 0; index -= 1) {
    if (isGone(state.appointments[index]?.vehicle.id ?? 0)) {
      state.appointments.splice(index, 1);
    }
  }
}
