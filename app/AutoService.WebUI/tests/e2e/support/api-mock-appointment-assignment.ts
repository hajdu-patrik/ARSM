/** Claim, unclaim and admin assign/unassign mock routes, with the API's refusals for closed appointments. */
import type { Route } from '@playwright/test';
import type { AppointmentDto } from '../../../src/types/scheduler/scheduler.types';
import type { InstallApiMockOptions } from './api-mocks';
import type { MockApiState } from './test-data';
import { withLifecycleFlags } from './api-mock-data';
import { fulfillJson } from './api-mock-response';
import { mechanicSummary } from './appointment-fixtures';

const CLAIM_PATH = /^\/api\/appointments\/(\d+)\/claim$/;
const ASSIGN_PATH = /^\/api\/appointments\/(\d+)\/assign\/(\d+)$/;

/** The person id the mocked login reports for these options. */
function sessionPersonId(state: MockApiState, options: InstallApiMockOptions): number {
  const adminPersonId = state.mechanics.find((mechanic) => mechanic.isAdmin)?.personId ?? state.profile.personId;

  return options.isAdmin === true ? adminPersonId : state.profile.personId;
}

/** The 422 code for an appointment that takes no assignment change, or null while it is open. */
function closedAppointmentCode(appointment: AppointmentDto): string | null {
  if (appointment.status === 'Cancelled') {
    return 'appointment_cancelled';
  }

  return appointment.status === 'Completed' ? 'appointment_completed' : null;
}

/** Stores the new mechanic list (the version stays, as the join table is not the appointment row) and returns the DTO. */
function storeMechanics(state: MockApiState, appointment: AppointmentDto, mechanics: AppointmentDto['mechanics']): AppointmentDto {
  const updated = { ...appointment, mechanics };
  state.appointments[state.appointments.indexOf(appointment)] = updated;

  return withLifecycleFlags(state, updated);
}

/** Adds a mechanic to an open appointment, refusing a missing or closed one and a mechanic already on it. */
async function assignMechanic(
  route: Route,
  state: MockApiState,
  appointmentId: number,
  mechanicId: number,
  alreadyAssignedCode: string,
): Promise<void> {
  const appointment = state.appointments.find((candidate) => candidate.id === appointmentId);
  if (appointment === undefined) {
    await fulfillJson(route, { code: 'appointment_not_found' }, 404);
    return;
  }

  const closedCode = closedAppointmentCode(appointment);
  if (closedCode !== null) {
    await fulfillJson(route, { code: closedCode }, 422);
    return;
  }

  if (appointment.mechanics.some((mechanic) => mechanic.id === mechanicId)) {
    await fulfillJson(route, { code: alreadyAssignedCode }, 409);
    return;
  }

  await fulfillJson(route, storeMechanics(state, appointment, [...appointment.mechanics, mechanicSummary(state, mechanicId)]));
}

/** Removes a mechanic from an open appointment, refusing a missing or closed one, a stranger and the last mechanic. */
async function unassignMechanic(route: Route, state: MockApiState, appointmentId: number, mechanicId: number): Promise<void> {
  const appointment = state.appointments.find((candidate) => candidate.id === appointmentId);
  if (appointment === undefined) {
    await fulfillJson(route, { code: 'appointment_not_found' }, 404);
    return;
  }

  const closedCode = closedAppointmentCode(appointment);
  if (closedCode !== null) {
    await fulfillJson(route, { code: closedCode }, 422);
    return;
  }

  if (!appointment.mechanics.some((mechanic) => mechanic.id === mechanicId)) {
    await fulfillJson(route, { code: 'not_assigned' }, 409);
    return;
  }

  if (appointment.mechanics.length <= 1) {
    await fulfillJson(route, { code: 'last_assigned_mechanic' }, 422);
    return;
  }

  await fulfillJson(route, storeMechanics(state, appointment, appointment.mechanics.filter((mechanic) => mechanic.id !== mechanicId)));
}

/** Dispatches the claim (`/claim`) and admin assignment (`/assign/{mechanicId}`) routes of an appointment. */
export async function tryHandleAssignmentRoute(
  route: Route,
  method: string,
  path: string,
  state: MockApiState,
  options: InstallApiMockOptions,
): Promise<boolean> {
  const claimMatch = CLAIM_PATH.exec(path);
  if (claimMatch !== null && (method === 'PUT' || method === 'DELETE')) {
    const appointmentId = Number(claimMatch[1]);
    const personId = sessionPersonId(state, options);

    if (method === 'PUT') {
      await assignMechanic(route, state, appointmentId, personId, 'already_claimed');
    } else {
      await unassignMechanic(route, state, appointmentId, personId);
    }

    return true;
  }

  const assignMatch = ASSIGN_PATH.exec(path);
  if (assignMatch !== null && (method === 'PUT' || method === 'DELETE')) {
    const appointmentId = Number(assignMatch[1]);
    const mechanicId = Number(assignMatch[2]);

    if (method === 'PUT' && !state.mechanics.some((mechanic) => mechanic.personId === mechanicId)) {
      await fulfillJson(route, { code: 'mechanic_not_found' }, 404);
      return true;
    }

    if (method === 'PUT') {
      await assignMechanic(route, state, appointmentId, mechanicId, 'already_assigned');
    } else {
      await unassignMechanic(route, state, appointmentId, mechanicId);
    }

    return true;
  }

  return false;
}
