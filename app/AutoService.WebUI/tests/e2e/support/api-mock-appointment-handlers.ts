import type { Route } from '@playwright/test';
import type {
  AppointmentDto,
  AppointmentStatus,
  SchedulerCreateIntakeRequest,
  UpdateAppointmentRequest,
} from '../../../src/types/scheduler/scheduler.types';
import type { InstallApiMockOptions } from './api-mocks';
import type { MockApiState } from './test-data';
import { isAuthenticated } from './api-mock-authz';
import { createAppointment, deleteAppointment, withLifecycleFlags } from './api-mock-data';
import { tryHandleAssignmentRoute } from './api-mock-appointment-assignment';
import { corsHeaders, fulfillJson, fulfillNoContent, rejectStaleVersion } from './api-mock-response';

/** Code of the 409 the API answers a status change or update that carries a stale version with. */
const APPOINTMENT_VERSION_CONFLICT_CODE = 'appointment_version_conflict';

/** Codes of the 409s that refuse a completion without an accepted quote and any change to a Completed appointment. */
const COMPLETION_REQUIRES_ACCEPTED_QUOTE_CODE = 'appointment_completion_requires_accepted_quote';
const COMPLETED_TERMINAL_CODE = 'appointment_completed_terminal';

/** Stores an appointment write in the mock state with the next concurrency version, like the API. */
function applyAppointmentWrite(state: MockApiState, appointment: AppointmentDto, changes: Partial<AppointmentDto>): AppointmentDto {
  const updated = { ...appointment, ...changes, version: appointment.version + 1 };
  state.appointments[state.appointments.indexOf(appointment)] = updated;
  return withLifecycleFlags(state, updated);
}

/** Dispatches `/api/appointments` mock requests, including the live update stream. */
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

  // The scheduler opens a live update stream while mounted. Answering it with a valid, empty event
  // stream (with the CORS headers a credentialed cross-origin EventSource needs) keeps the client from retrying against an error.
  if (path === '/api/appointments/updates' && method === 'GET') {
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      headers: corsHeaders(route),
      body: ': mock appointment updates stream ready\n\n',
    });
    return true;
  }

  if (path === '/api/appointments' && method === 'GET') {
    await fulfillJson(route, state.appointments.map((appointment) => withLifecycleFlags(state, appointment)));
    return true;
  }

  if (path === '/api/appointments/intake' && method === 'POST') {
    const request = route.request().postDataJSON() as SchedulerCreateIntakeRequest;
    const appointment = createAppointment(state, request);
    if (request.vehicle !== undefined && request.vehicleId === undefined) {
      // A new vehicle of a known customer: the appointment carries the typed vehicle, not the customer's first one.
      appointment.vehicle = { ...appointment.vehicle, ...request.vehicle, id: state.nextVehicleId };
      state.nextVehicleId += 1;
    }
    await fulfillJson(route, withLifecycleFlags(state, appointment), 201);
    return true;
  }

  const appointmentStatusMatch = /^\/api\/appointments\/(\d+)\/status$/.exec(path);
  if (appointmentStatusMatch && method === 'PUT') {
    await handleStatusChange(route, state, Number(appointmentStatusMatch[1]));
    return true;
  }

  const appointmentByIdMatch = /^\/api\/appointments\/(\d+)$/.exec(path);
  if (appointmentByIdMatch && method === 'PUT') {
    await handleUpdate(route, state, Number(appointmentByIdMatch[1]));
    return true;
  }

  if (appointmentByIdMatch && method === 'DELETE') {
    const appointmentId = Number(appointmentByIdMatch[1]);

    if (state.appointments.find((candidate) => candidate.id === appointmentId)?.status === 'Completed') {
      await fulfillJson(route, { code: COMPLETED_TERMINAL_CODE }, 409);
      return true;
    }

    if (!deleteAppointment(state, appointmentId)) {
      await fulfillJson(route, { code: 'appointment_not_found' }, 404);
      return true;
    }

    await fulfillNoContent(route);
    return true;
  }

  return tryHandleAssignmentRoute(route, method, path, state, options);
}

/** `PUT /api/appointments/{id}/status`: refuses a missing or stale version, a change away from Completed
 * and a completion without an accepted quote, else changes the status. */
async function handleStatusChange(route: Route, state: MockApiState, appointmentId: number): Promise<void> {
  const appointment = state.appointments.find((candidate) => candidate.id === appointmentId);

  if (!appointment) {
    await fulfillJson(route, { detail: 'Appointment not found.' }, 404);
    return;
  }

  const { status, version } = route.request().postDataJSON() as { status: AppointmentStatus; version?: number };
  if (await rejectStaleVersion(route, appointment.version, version, APPOINTMENT_VERSION_CONFLICT_CODE)) {
    return;
  }

  if (status !== appointment.status) {
    if (appointment.status === 'Completed') {
      await fulfillJson(route, { code: COMPLETED_TERMINAL_CODE }, 409);
      return;
    }

    if (status === 'Completed' && !withLifecycleFlags(state, appointment).canComplete) {
      await fulfillJson(route, { code: COMPLETION_REQUIRES_ACCEPTED_QUOTE_CODE }, 409);
      return;
    }
  }

  await fulfillJson(route, applyAppointmentWrite(state, appointment, { status }));
}

/** `PUT /api/appointments/{id}`: refuses a missing or stale version, else saves the due date and the task text. */
async function handleUpdate(route: Route, state: MockApiState, appointmentId: number): Promise<void> {
  const appointment = state.appointments.find((candidate) => candidate.id === appointmentId);

  if (!appointment) {
    await fulfillJson(route, { detail: 'Appointment not found.' }, 404);
    return;
  }

  const { dueDateTime, taskDescription, version } = route.request().postDataJSON() as Partial<UpdateAppointmentRequest>;
  if (await rejectStaleVersion(route, appointment.version, version, APPOINTMENT_VERSION_CONFLICT_CODE)) {
    return;
  }

  await fulfillJson(route, applyAppointmentWrite(state, appointment, {
    dueDateTime: dueDateTime ?? appointment.dueDateTime,
    taskDescription: taskDescription ?? appointment.taskDescription,
  }));
}
