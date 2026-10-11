/** Edit-form helpers of the appointment detail dialog: form state, validation and change detection. */
import type {
  AppointmentDto,
  UpdateAppointmentRequest,
} from '../../../../types/scheduler/scheduler.types';
import { toDatetimeLocalValue } from '../../utils/due-date';

/** The validated update payload built from the edit form. */
export interface UpdateEditFormResult {
  appointment: UpdateAppointmentRequest;
}

/** Editable fields of the detail dialog, as the inputs hold them. */
export interface EditFormState {
  dueDateTime: string;
  taskDescription: string;
}

/** Fills the edit form from an appointment. */
export function buildEditForm(appointment: AppointmentDto): EditFormState {
  return {
    dueDateTime: toDatetimeLocalValue(appointment.dueDateTime),
    taskDescription: appointment.taskDescription,
  };
}

/** Normalizes a typed edit-form value; every field is kept as typed today. */
export function normalizeEditFieldValue(_field: keyof EditFormState, value: string): string {
  return value;
}

/** Validates edit-form values and builds the appointment update payload. */
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

/** True when the request changes the task text or the due moment of the appointment. */
export function hasAppointmentEditChanges(
  appointment: AppointmentDto,
  request: UpdateAppointmentRequest,
): boolean {
  if (appointment.taskDescription.trim() !== request.taskDescription.trim()) {
    return true;
  }

  const currentDueMs = Date.parse(appointment.dueDateTime);
  const nextDueMs = Date.parse(request.dueDateTime);

  if (Number.isNaN(currentDueMs) || Number.isNaN(nextDueMs)) {
    return appointment.dueDateTime !== request.dueDateTime;
  }

  return currentDueMs !== nextDueMs;
}

/** True when the edit form is valid and differs from the appointment, which is what enables saving. */
export function canSaveEditForm(appointment: AppointmentDto, editForm: EditFormState): boolean {
  const validation = buildUpdateRequestFromEditForm(appointment, editForm);

  return !('errorKey' in validation) && hasAppointmentEditChanges(appointment, validation.request.appointment);
}

/** Applies a saved edit to a copy of the appointment, so the edit form restarts from the saved values. */
export function buildUpdatedAppointmentSnapshot(
  appointment: AppointmentDto,
  request: UpdateEditFormResult,
): AppointmentDto {
  return {
    ...appointment,
    dueDateTime: request.appointment.dueDateTime,
    taskDescription: request.appointment.taskDescription,
  };
}
