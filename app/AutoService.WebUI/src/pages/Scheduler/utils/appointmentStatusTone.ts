/**
 * Appointment status to semantic tone mapping.
 * The single place that decides how a status is colored; badges, calendar dots and status filter
 * chips resolve their classes from the shared tone recipes through it.
 * @module pages/Scheduler/utils/appointmentStatusTone
 */
import type { AppointmentStatus } from '../../../types/scheduler/scheduler.types';
import type { SignalTone } from '../../../utils/formStyles';

/** Semantic tone of each appointment status. */
export const APPOINTMENT_STATUS_TONE: Record<AppointmentStatus, SignalTone> = {
  InProgress: 'warning',
  Completed: 'success',
  Cancelled: 'error',
};
