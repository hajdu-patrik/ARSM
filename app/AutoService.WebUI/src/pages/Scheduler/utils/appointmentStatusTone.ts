/** Maps each appointment status to its semantic tone; badges, calendar dots, and filter chips all resolve color through this (see CLAUDE.md). */
import type { AppointmentStatus } from '../../../types/scheduler/scheduler.types';
import type { SignalTone } from '../../../utils/formStyles';

export const APPOINTMENT_STATUS_TONE: Record<AppointmentStatus, SignalTone> = {
  InProgress: 'warning',
  Completed: 'success',
  Cancelled: 'error',
};
