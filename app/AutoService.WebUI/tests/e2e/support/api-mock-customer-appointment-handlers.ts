import type { Route } from '@playwright/test';
import type { AppointmentStatus, SchedulerCreateIntakeRequest } from '../../../src/types/scheduler/scheduler.types';
import type { CreateVehicleRequest } from '../../../src/types/customers/customers.types';
import type { InstallApiMockOptions } from './api-mocks';
import type { MockApiState } from './test-data';
import { isAuthenticated } from './api-mock-authz';
import { createAppointment, createVehicle, getLookupName } from './api-mock-data';
import { fulfillJson } from './api-mock-response';

export async function tryHandleCustomerRoute(
  route: Route,
  method: string,
  path: string,
  url: URL,
  state: MockApiState,
  options: InstallApiMockOptions,
): Promise<boolean> {
  if (!isAuthenticated(options)) {
    await fulfillJson(route, { detail: 'Unauthorized' }, 401);
    return true;
  }

  if (path === '/api/customers' && method === 'GET') {
    await fulfillJson(route, state.customers);
    return true;
  }

  if (path === '/api/customers/by-email' && method === 'GET') {
    await handleCustomerByEmail(route, url, state);
    return true;
  }

  if (path === '/api/customers/by-license-plate' && method === 'GET') {
    await handleCustomerByLicensePlate(route, url, state);
    return true;
  }

  if (path === '/api/customers/by-name' && method === 'GET') {
    const query = (url.searchParams.get('name') ?? '').trim();
    const normalizedNameQuery = query.toLowerCase();
    const normalizedPlateQuery = query.replaceAll(/\s+/g, '').toUpperCase();
    const matches = state.schedulerLookupCustomers.filter((customer) => {
      const nameMatch = getLookupName(customer).toLowerCase().includes(normalizedNameQuery);
      const plateMatch = customer.vehicles.some((vehicle) => vehicle.licensePlate.replaceAll(/\s+/g, '').toUpperCase().includes(normalizedPlateQuery));
      return nameMatch || plateMatch;
    });
    await fulfillJson(route, matches);
    return true;
  }

  return tryHandleCustomerNestedRoute(route, method, path, state, options);
}

async function tryHandleCustomerNestedRoute(
  route: Route,
  method: string,
  path: string,
  state: MockApiState,
  options: InstallApiMockOptions,
): Promise<boolean> {
  const customerVehiclesMatch = /^\/api\/customers\/(\d+)\/vehicles$/.exec(path);
  if (customerVehiclesMatch && method === 'GET') {
    const customerId = Number(customerVehiclesMatch[1]);
    await fulfillJson(route, state.vehiclesByCustomerId[customerId] ?? []);
    return true;
  }

  if (customerVehiclesMatch && method === 'POST') {
    const customerId = Number(customerVehiclesMatch[1]);
    const createdVehicle = createVehicle(state, customerId, route.request().postDataJSON() as CreateVehicleRequest);
    await fulfillJson(route, createdVehicle, 201);
    return true;
  }

  const customerHistoryMatch = /^\/api\/customers\/(\d+)\/appointments$/.exec(path);
  if (customerHistoryMatch && method === 'GET') {
    const customerId = Number(customerHistoryMatch[1]);
    if (options.failedCustomerHistoryIds?.includes(customerId)) {
      await fulfillJson(route, { detail: 'Customer history unavailable' }, 422);
      return true;
    }

    await fulfillJson(route, state.customerHistoryByCustomerId[customerId] ?? []);
    return true;
  }

  const vehicleMatch = /^\/api\/vehicles\/(\d+)$/.exec(path);
  if (vehicleMatch && method === 'GET') {
    const vehicleId = Number(vehicleMatch[1]);
    const vehicle = Object.values(state.vehiclesByCustomerId).flat().find((candidate) => candidate.id === vehicleId);

    if (!vehicle) {
      await fulfillJson(route, { detail: 'Vehicle not found.' }, 404);
      return true;
    }

    await fulfillJson(route, vehicle);
    return true;
  }

  const vehicleHistoryMatch = /^\/api\/vehicles\/(\d+)\/appointments$/.exec(path);
  if (vehicleHistoryMatch && method === 'GET') {
    const vehicleId = Number(vehicleHistoryMatch[1]);
    if (options.failedVehicleHistoryIds?.includes(vehicleId)) {
      await fulfillJson(route, { detail: 'Vehicle history unavailable' }, 422);
      return true;
    }

    await fulfillJson(route, state.vehicleHistoryByVehicleId[vehicleId] ?? []);
    return true;
  }

  return false;
}

async function handleCustomerByEmail(route: Route, url: URL, state: MockApiState): Promise<void> {
  const email = (url.searchParams.get('email') ?? '').toLowerCase();
  const customer = state.schedulerLookupCustomers.find((item) => item.email.toLowerCase() === email);

  if (customer) {
    await fulfillJson(route, customer);
    return;
  }

  await fulfillJson(route, { detail: 'Customer not found' }, 404);
}

async function handleCustomerByLicensePlate(route: Route, url: URL, state: MockApiState): Promise<void> {
  const plate = (url.searchParams.get('licensePlate') ?? '').toUpperCase();
  const customer = state.schedulerLookupCustomers.find((item) => item.vehicles.some((vehicle) => vehicle.licensePlate === plate));

  if (customer) {
    const matchedVehicleId = customer.vehicles.find((vehicle) => vehicle.licensePlate === plate)?.id ?? null;
    await fulfillJson(route, { ...customer, matchedVehicleId });
    return;
  }

  await fulfillJson(route, { detail: 'Customer not found' }, 404);
}

export async function tryHandleAppointmentRoute(
  route: Route,
  method: string,
  path: string,
  state: MockApiState,
  options: InstallApiMockOptions,
): Promise<boolean> {
  if (!isAuthenticated(options)) {
    await fulfillJson(route, { detail: 'Unauthorized' }, 401);
    return true;
  }

  // The scheduler opens a live update stream while mounted. Answering it with a valid, empty
  // event stream keeps the mock from returning 404 and the client from retrying against an error.
  if (path === '/api/appointments/updates' && method === 'GET') {
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: ': mock appointment updates stream ready\n\n',
    });
    return true;
  }

  if (path === '/api/appointments/today' && method === 'GET') {
    await fulfillJson(route, []);
    return true;
  }

  if (path === '/api/appointments' && method === 'GET') {
    await fulfillJson(route, state.appointments);
    return true;
  }

  if (path === '/api/appointments/intake' && method === 'POST') {
    const appointment = createAppointment(state, route.request().postDataJSON() as SchedulerCreateIntakeRequest);
    await fulfillJson(route, appointment, 201);
    return true;
  }

  const appointmentStatusMatch = /^\/api\/appointments\/(\d+)\/status$/.exec(path);
  if (appointmentStatusMatch && method === 'PUT') {
    const appointmentId = Number(appointmentStatusMatch[1]);
    const appointmentIndex = state.appointments.findIndex((appointment) => appointment.id === appointmentId);

    if (appointmentIndex < 0) {
      await fulfillJson(route, { detail: 'Appointment not found.' }, 404);
      return true;
    }

    const { status } = route.request().postDataJSON() as { status: AppointmentStatus };
    const updated = { ...state.appointments[appointmentIndex], status };
    state.appointments[appointmentIndex] = updated;
    await fulfillJson(route, updated);
    return true;
  }

  return false;
}
