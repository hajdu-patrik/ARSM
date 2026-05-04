import type {
  AppointmentDto,
  UpdateAppointmentRequest,
} from '../../../../types/scheduler/scheduler.types';

export interface UpdateEditFormResult {
  appointment: UpdateAppointmentRequest;
}

export interface EditFormState {
  dueDateTime: string;
  taskDescription: string;
}

export function buildEditForm(appointment: AppointmentDto): EditFormState {
  return {
    dueDateTime: toDatetimeLocalValue(appointment.dueDateTime),
    taskDescription: appointment.taskDescription,
  };
}

export function normalizeEditFieldValue(_field: keyof EditFormState, value: string): string {
  return value;
}

/**
 * Validates edit-form values and builds the appointment update payload.
 */
export function buildUpdateRequestFromEditForm(
  appointment: AppointmentDto,
  editForm: EditFormState,
): { request: UpdateEditFormResult } | { errorKey: string } {
  const taskDescription = editForm.taskDescription.trim();
  if (!taskDescription) {
    return { errorKey: 'scheduler.intake.errors.taskRequired' };
  }

  if (!editForm.dueDateTime) {
    return { errorKey: 'scheduler.intake.errors.dueRequired' };
  }

  const scheduledMs = Date.parse(appointment.scheduledDate);

  if (Number.isNaN(scheduledMs)) {
    return { errorKey: 'scheduler.intake.errors.scheduledRequired' };
  }

  const dueMs = Date.parse(editForm.dueDateTime);
  if (Number.isNaN(dueMs)) {
    return { errorKey: 'scheduler.intake.errors.dueRequired' };
  }

  if (dueMs < scheduledMs) {
    return { errorKey: 'scheduler.intake.errors.dueBeforeScheduled' };
  }

  const appointmentRequest: UpdateAppointmentRequest = {
    dueDateTime: new Date(dueMs).toISOString(),
    taskDescription,
  };

  return {
    request: {
      appointment: appointmentRequest,
    },
  };
}

/**
 * Applies a successful edit result to the local appointment snapshot so the
 * modal can reflect saved values without a full list refetch.
 */
export function buildUpdatedAppointmentSnapshot(
  appointment: AppointmentDto,
  request: UpdateEditFormResult,
): AppointmentDto {
  return {
    ...appointment,
    dueDateTime: request.appointment.dueDateTime,
    taskDescription: request.appointment.taskDescription,
    vehicle: appointment.vehicle,
  };
}

function toDatetimeLocalValue(isoValue: string): string {
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hour}:${minute}`;
}
