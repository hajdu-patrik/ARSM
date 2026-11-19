/** The i18n key of an appointment status label, shared by the badge, filter chips, status select and confirmation. */
import type { AppointmentStatus } from '../../../types/scheduler/scheduler.types';

export function appointmentStatusLabelKey(status: AppointmentStatus): string {
  return `scheduler.status.${status.toLowerCase()}`;
}
