import type { Route } from '@playwright/test';
import type { InstallApiMockOptions } from './api-mocks';
import type { MockApiState } from './test-data';
import { PROTECTED_DEMO_MECHANIC_EMAILS } from './test-data';
import { isAuthenticated } from './api-mock-authz';
import { compareText, fulfillPaged } from './api-mock-paging';
import { fulfillJson, fulfillNoContent } from './api-mock-response';

/** Dispatches `/api/admin/*` mock requests: admin-only mechanic list, guarded delete and password reset. */
export async function tryHandleAdminRoute(
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
    await fulfillPaged(route, state.mechanics, {
      searchFields: (mechanic) => [
        mechanic.firstName,
        mechanic.middleName,
        mechanic.lastName,
        `${mechanic.firstName} ${mechanic.lastName}`,
        mechanic.email,
        mechanic.phoneNumber,
        mechanic.specialization,
      ],
      compare: (left, right) => compareText(left.lastName, right.lastName)
        || compareText(left.firstName, right.firstName)
        || left.personId - right.personId,
    });
    return true;
  }

  const passwordResetMatch = /^\/api\/admin\/mechanics\/(\d+)\/password-reset$/.exec(path);
  if (passwordResetMatch && method === 'POST') {
    await handlePasswordReset(route, state, Number(passwordResetMatch[1]));
    return true;
  }

  const mechanicDeleteMatch = /^\/api\/admin\/mechanics\/(\d+)$/.exec(path);
  if (mechanicDeleteMatch && method === 'DELETE') {
    const personId = Number(mechanicDeleteMatch[1]);
    const target = state.mechanics.find((mechanic) => mechanic.personId === personId);
    if (!target) {
      await fulfillJson(route, { detail: 'Mechanic not found.' }, 404);
      return true;
    }

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

    state.mechanics.splice(state.mechanics.indexOf(target), 1);
    await fulfillNoContent(route);
    return true;
  }

  return false;
}

/** `POST /api/admin/mechanics/{id}/password-reset`: 404 for an unknown mechanic, 403 for an admin, 400 with the
 * Identity policy codes for a weak password, else 200 with `emailSent`. */
async function handlePasswordReset(route: Route, state: MockApiState, personId: number): Promise<void> {
  const target = state.mechanics.find((mechanic) => mechanic.personId === personId);
  if (!target) {
    await fulfillJson(route, { detail: 'Mechanic not found.' }, 404);
    return;
  }

  if (target.isAdmin) {
    await fulfillJson(route, { detail: 'The password of an administrator cannot be reset.' }, 403);
    return;
  }

  const { temporaryPassword = '' } = route.request().postDataJSON() as { temporaryPassword?: string };
  if (temporaryPassword.length < 8) {
    await fulfillJson(route, { errors: { PasswordTooShort: ['Passwords must be at least 8 characters.'] } }, 400);
    return;
  }

  if (!/[A-Z]/.test(temporaryPassword)) {
    await fulfillJson(route, { errors: { PasswordRequiresUpper: ["Passwords must have at least one uppercase ('A'-'Z')."] } }, 400);
    return;
  }

  await fulfillJson(route, { emailSent: true, email: target.email });
}
