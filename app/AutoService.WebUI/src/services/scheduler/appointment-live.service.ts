/** Subscribes to appointment SSE updates and re-dispatches a DOM event; consumers refresh their view
 * rather than patch state, since an appointment can move between months (see WebUI CLAUDE.md). */

import { appointmentService } from './appointment.service';
import { createLiveUpdateChannel } from '../live/live-update-channel';

/** Custom event name dispatched when any appointment changes. */
export const APPOINTMENT_UPDATED_EVENT = 'autoservice:appointment-updated';

/** Detail payload for the {@code autoservice:appointment-updated} custom event. */
export interface AppointmentUpdatedDetail {
  /** Appointment that changed. */
  appointmentId: number;
  /** Unix milliseconds when the change was published. */
  occurredAt: number;
}

/** Parses a raw SSE data string into a typed appointment update detail, or null if invalid. */
function parseAppointmentUpdate(data: string): AppointmentUpdatedDetail | null {
  try {
    const parsed = JSON.parse(data) as Partial<AppointmentUpdatedDetail>;
    if (typeof parsed.appointmentId !== 'number' || typeof parsed.occurredAt !== 'number') {
      return null;
    }

    return { appointmentId: parsed.appointmentId, occurredAt: parsed.occurredAt };
  } catch {
    return null;
  }
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
