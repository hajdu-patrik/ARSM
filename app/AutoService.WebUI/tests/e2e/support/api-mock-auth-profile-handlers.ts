import type { Route } from '@playwright/test';
import type { RegisterMechanicRequest } from '../../../src/services/admin/admin.service';
import type { ChangePasswordRequest, UpdateProfileRequest } from '../../../src/types/profile/profile.types';
import type { InstallApiMockOptions } from './api-mocks';
import type { MockApiState } from './test-data';
import { isAuthenticated } from './api-mock-authz';
import { corsHeaders, fulfillJson, fulfillNoContent } from './api-mock-response';

function getAuthPayload(state: MockApiState, options: InstallApiMockOptions): { personId: number; isAdmin: boolean } {
  const adminPersonId = state.mechanics.find((mechanic) => mechanic.isAdmin)?.personId ?? state.profile.personId;
  return {
    personId: options.isAdmin ? adminPersonId : state.profile.personId,
    isAdmin: options.isAdmin ?? false,
  };
}

export async function tryHandleAuthRoute(
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
      await handleAuthValidate(route, state, options);
      return true;
    case 'POST /api/auth/refresh':
      await handleAuthRefresh(route, state, options);
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

async function handleAuthRefresh(
  route: Route,
  state: MockApiState,
  options: InstallApiMockOptions,
): Promise<void> {
  if (options.refreshShouldFail) {
    await fulfillJson(route, { detail: 'Unauthorized' }, 401);
    return;
  }

  await handleAuthValidate(route, state, options);
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

export async function tryHandleProfileRoute(
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
