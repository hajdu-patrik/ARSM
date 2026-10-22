/** Subscribes to appointment SSE updates and re-dispatches a DOM event; consumers refresh their view
 * rather than patch state, since an appointment can move between months (see WebUI CLAUDE.md). */

import { appointmentService } from './appointment.service';
import { createLiveUpdateChannel, parseJsonObject } from '../live/live-update-channel';

export const APPOINTMENT_UPDATED_EVENT = 'autoservice:appointment-updated';

interface AppointmentUpdatedDetail {
  appointmentId: number;
  /** Unix milliseconds when the change was published. */
  occurredAt: number;
}

function parseAppointmentUpdate(data: string): AppointmentUpdatedDetail | null {
  const parsed = parseJsonObject(data);
  if (parsed === null || typeof parsed.appointmentId !== 'number' || typeof parsed.occurredAt !== 'number') {
    return null;
  }

  return { appointmentId: parsed.appointmentId, occurredAt: parsed.occurredAt };
}

const channel = createLiveUpdateChannel<AppointmentUpdatedDetail>({
  resolveUrl: () => appointmentService.getAppointmentUpdatesUrl(),
  sseEventName: 'appointment-updated',
  domEventName: APPOINTMENT_UPDATED_EVENT,
  parse: parseAppointmentUpdate,
});

/** Subscribes to real-time appointment updates; tears down the SSE connection when the last subscriber leaves. */
export function startAppointmentLiveUpdates(): () => void {
  return channel.start();
}

/** Subscribe half of the `useSyncExternalStore` pair that follows whether the appointment stream is open. */
export const subscribeToAppointmentLiveConnection = channel.subscribe;

/** Snapshot half of that pair: true while the appointment stream is open. */
export const isAppointmentLiveConnected = channel.isConnected;
