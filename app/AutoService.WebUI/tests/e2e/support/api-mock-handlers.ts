import type { Route } from '@playwright/test';
import type { SchedulerCreateIntakeRequest } from '../../../src/types/scheduler/scheduler.types';
import type { CreateVehicleRequest } from '../../../src/types/customers/customers.types';
import type { RegisterMechanicRequest } from '../../../src/services/admin/admin.service';
import type { ChangePasswordRequest, UpdateProfileRequest } from '../../../src/types/profile/profile.types';
import type { InstallApiMockOptions } from './api-mocks';
import type { MockApiState } from './test-data';
import { PROTECTED_DEMO_MECHANIC_EMAILS } from './test-data';
import { createAppointment, createVehicle, getLookupName } from './api-mock-data';
import { corsHeaders, fulfillJson, fulfillNoContent } from './api-mock-response';

function normalizeApiPath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

function isAuthenticated(options: InstallApiMockOptions): boolean {
  return options.isAuthenticated !== false;
}

function getAuthPayload(state: MockApiState, options: InstallApiMockOptions): { personId: number; isAdmin: boolean } {
  const adminPersonId = state.mechanics.find((mechanic) => mechanic.isAdmin)?.personId ?? state.profile.personId;
  return {
    personId: options.isAdmin ? adminPersonId : state.profile.personId,
    isAdmin: options.isAdmin ?? false,
  };
}

export async function handleApiRoute(
  route: Route,
  state: MockApiState,
  options: InstallApiMockOptions,
): Promise<void> {
  const request = route.request();
  const url = new URL(request.url());
  const method = request.method().toUpperCase();
  const path = normalizeApiPath(url.pathname);

  if (method === 'OPTIONS') {
    await fulfillNoContent(route);
    return;
  }

  if (await tryHandleAuthRoute(route, method, path, options, state)) {
    return;
  }

  if (await tryHandleProfileRoute(route, method, path, options, state)) {
    return;
  }

  if (await tryHandleAdminRoute(route, method, path, options, state)) {
    return;
  }

  if (await tryHandleCustomerRoute(route, method, path, url, state, options)) {
    return;
  }

  if (await tryHandleAppointmentRoute(route, method, path, state, options)) {
    return;
  }

  await fulfillJson(route, { detail: `Unhandled mock route: ${method} ${path}` }, 404);
}

async function tryHandleAuthRoute(
  route: Route,
  method: string,
  path: string,
  options: InstallApiMockOptions,
  state: MockApiState,
): Promise<boolean> {
  const routeKey = `${method} ${path}`;

  switch (routeKey) {
    case 'POST /api/auth/login':
      await fulfillJson(route, getAuthPayload(state, options));
      return true;
    case 'POST /api/auth/register':
      await handleAuthRegister(route, state, options);
      return true;
    case 'GET /api/auth/validate':
    case 'POST /api/auth/refresh':
      await handleAuthValidate(route, state, options);
      return true;
    case 'POST /api/auth/logout':
      await fulfillNoContent(route);
      return true;
    default:
      return false;
  }
}

async function handleAuthRegister(
  route: Route,
  state: MockApiState,
  options: InstallApiMockOptions,
): Promise<void> {
  if (!isAuthenticated(options)) {
    await fulfillJson(route, { detail: 'Unauthorized' }, 401);
    return;
  }

  if (!options.isAdmin) {
    await fulfillJson(route, { detail: 'Forbidden' }, 403);
    return;
  }

  const payload = route.request().postDataJSON() as Partial<RegisterMechanicRequest>;
  if (!payload.email || !payload.firstName || !payload.lastName || !payload.password) {
    await fulfillJson(route, { detail: 'Required fields are missing.' }, 422);
    return;
  }

  const createdMechanic = {
    personId: state.nextMechanicPersonId,
    firstName: payload.firstName,
    middleName: payload.middleName ?? null,
    lastName: payload.lastName,
    email: payload.email,
    phoneNumber: payload.phoneNumber ?? null,
    specialization: payload.specialization ?? 'All',
    hasProfilePicture: false,
    isAdmin: false,
  };

  state.nextMechanicPersonId += 1;
  state.mechanics.push(createdMechanic);
  await fulfillJson(route, { personId: createdMechanic.personId, personType: 'mechanic', email: createdMechanic.email }, 201);
}

async function handleAuthValidate(
  route: Route,
  state: MockApiState,
  options: InstallApiMockOptions,
): Promise<void> {
  if (!isAuthenticated(options)) {
    await fulfillJson(route, { detail: 'Unauthorized' }, 401);
    return;
  }

  await fulfillJson(route, getAuthPayload(state, options));
}

async function tryHandleProfileRoute(
  route: Route,
  method: string,
  path: string,
  options: InstallApiMockOptions,
  state: MockApiState,
): Promise<boolean> {
  if (!path.startsWith('/api/profile')) {
    return false;
  }

  if (!isAuthenticated(options)) {
    await fulfillJson(route, { detail: 'Unauthorized' }, 401);
    return true;
  }

  const routeKey = `${method} ${path}`;
  const handler = getProfileRouteHandler(routeKey);

  if (!handler) {
    return false;
  }

  await handler(route, state);
  return true;
}

type ProfileRouteHandler = (route: Route, state: MockApiState) => Promise<void>;

function getProfileRouteHandler(routeKey: string): ProfileRouteHandler | null {
  const routeHandlers: Record<string, ProfileRouteHandler> = {
    'GET /api/profile': handleProfileGet,
    'PUT /api/profile': handleProfilePut,
    'POST /api/profile/change-password': handleProfileChangePassword,
    'DELETE /api/profile': handleProfileDelete,
    'PUT /api/profile/picture': handleProfilePictureUpload,
    'DELETE /api/profile/picture': handleProfilePictureDelete,
    'GET /api/profile/picture/updates': handleProfilePictureUpdates,
  };

  return routeHandlers[routeKey] ?? null;
}

async function handleProfileGet(route: Route, state: MockApiState): Promise<void> {
  await fulfillJson(route, state.profile);
}

async function handleProfilePut(route: Route, state: MockApiState): Promise<void> {
  const payload = route.request().postDataJSON() as UpdateProfileRequest;

  if (typeof payload.firstName === 'string') {
    state.profile.firstName = payload.firstName;
  }
  if (typeof payload.lastName === 'string') {
    state.profile.lastName = payload.lastName;
  }
  if (typeof payload.email === 'string') {
    state.profile.email = payload.email;
  }
  if (typeof payload.phoneNumber === 'string') {
    state.profile.phoneNumber = payload.phoneNumber;
  }
  if (Object.hasOwn(payload, 'middleName')) {
    state.profile.middleName = payload.middleName?.trim() ? payload.middleName : null;
  }

  await fulfillJson(route, state.profile);
}

async function handleProfileChangePassword(route: Route): Promise<void> {
  const payload = route.request().postDataJSON() as Partial<ChangePasswordRequest>;
  if (!payload.currentPassword || !payload.newPassword || !payload.confirmNewPassword) {
    await fulfillJson(route, { detail: 'All password fields are required.' }, 422);
    return;
  }

  if (payload.newPassword !== payload.confirmNewPassword) {
    await fulfillJson(route, { detail: 'Passwords do not match.' }, 422);
    return;
  }

  await fulfillNoContent(route);
}

async function handleProfileDelete(route: Route): Promise<void> {
  await fulfillNoContent(route);
}

async function handleProfilePictureUpload(route: Route, state: MockApiState): Promise<void> {
  state.profile.hasProfilePicture = true;
  await fulfillNoContent(route);
}

async function handleProfilePictureDelete(route: Route, state: MockApiState): Promise<void> {
  state.profile.hasProfilePicture = false;
  await fulfillNoContent(route);
}

async function handleProfilePictureUpdates(route: Route): Promise<void> {
  await route.fulfill({ status: 204, headers: corsHeaders(route) });
}

async function tryHandleAdminRoute(
  route: Route,
  method: string,
  path: string,
  options: InstallApiMockOptions,
  state: MockApiState,
): Promise<boolean> {
  if (!path.startsWith('/api/admin/')) {
    return false;
  }

  if (!isAuthenticated(options)) {
    await fulfillJson(route, { detail: 'Unauthorized' }, 401);
    return true;
  }

  if (!options.isAdmin) {
    await fulfillJson(route, { detail: 'Forbidden' }, 403);
    return true;
  }

  if (path === '/api/admin/mechanics' && method === 'GET') {
    await fulfillJson(route, state.mechanics);
    return true;
  }

  const mechanicDeleteMatch = /^\/api\/admin\/mechanics\/(\d+)$/.exec(path);
  if (mechanicDeleteMatch && method === 'DELETE') {
    const personId = Number(mechanicDeleteMatch[1]);
    const mechanicIndex = state.mechanics.findIndex((mechanic) => mechanic.personId === personId);
    if (mechanicIndex < 0) {
      await fulfillJson(route, { detail: 'Mechanic not found.' }, 404);
      return true;
    }

    const target = state.mechanics[mechanicIndex];
    if (PROTECTED_DEMO_MECHANIC_EMAILS.has(target.email.toLowerCase())) {
      await fulfillJson(route, { detail: 'Cannot delete demo mechanic records used by seeded test data.' }, 422);
      return true;
    }

    if (target.isAdmin) {
      await fulfillJson(route, { detail: 'Cannot delete this mechanic because they are the last remaining mechanic.' }, 422);
      return true;
    }

    const deletableCount = state.mechanics.filter((mechanic) => !mechanic.isAdmin).length;
    if (deletableCount <= 1) {
      await fulfillJson(route, { detail: 'Cannot delete this mechanic because they are the last remaining mechanic.' }, 422);
      return true;
    }

    state.mechanics.splice(mechanicIndex, 1);
    await fulfillNoContent(route);
    return true;
  }

  return false;
}

async function tryHandleCustomerRoute(
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

  return tryHandleCustomerNestedRoute(route, method, path, state);
}

async function tryHandleCustomerNestedRoute(
  route: Route,
  method: string,
  path: string,
  state: MockApiState,
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
    await fulfillJson(route, state.customerHistoryByCustomerId[Number(customerHistoryMatch[1])] ?? []);
    return true;
  }

  const vehicleHistoryMatch = /^\/api\/vehicles\/(\d+)\/appointments$/.exec(path);
  if (vehicleHistoryMatch && method === 'GET') {
    await fulfillJson(route, state.vehicleHistoryByVehicleId[Number(vehicleHistoryMatch[1])] ?? []);
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

async function tryHandleAppointmentRoute(
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

  return false;
}
