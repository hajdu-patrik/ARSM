import type { AppointmentDto, UpdateAppointmentRequest } from '../../../../types/scheduler/scheduler.types';

export interface EditFormState {
  scheduledDate: string;
  dueDateTime: string;
  taskDescription: string;
  licensePlate: string;
  brand: string;
  model: string;
  year: string;
  mileageKm: string;
  enginePowerHp: string;
  engineTorqueNm: string;
}

export const VEHICLE_NUMERIC_LIMITS = {
  mileageKm: { min: 0, max: 1000000 },
  enginePowerHp: { min: 0, max: 50000 },
  engineTorqueNm: { min: 0, max: 50000 },
} as const;

export function buildEditForm(appointment: AppointmentDto): EditFormState {
  return {
    scheduledDate: toDatetimeLocalValue(appointment.scheduledDate),
    dueDateTime: toDatetimeLocalValue(appointment.dueDateTime),
    taskDescription: appointment.taskDescription,
    licensePlate: appointment.vehicle.licensePlate,
    brand: appointment.vehicle.brand,
    model: appointment.vehicle.model,
    year: String(appointment.vehicle.year),
    mileageKm: String(appointment.vehicle.mileageKm),
    enginePowerHp: String(appointment.vehicle.enginePowerHp),
    engineTorqueNm: String(appointment.vehicle.engineTorqueNm),
  };
}

export function normalizeEditFieldValue(field: keyof EditFormState, value: string): string {
  if (!(field in VEHICLE_NUMERIC_LIMITS)) {
    return value;
  }

  return normalizeRangedNumberInput(
    value,
    VEHICLE_NUMERIC_LIMITS[field as keyof typeof VEHICLE_NUMERIC_LIMITS].min,
    VEHICLE_NUMERIC_LIMITS[field as keyof typeof VEHICLE_NUMERIC_LIMITS].max,
  );
}

export function buildUpdateRequestFromEditForm(
  appointment: AppointmentDto,
  editForm: EditFormState,
  nowMs: number = Date.now(),
): { request: UpdateAppointmentRequest } | { errorKey: string } {
  const isPastAppointment = new Date(appointment.scheduledDate).getTime() < nowMs;

  const taskDescription = editForm.taskDescription.trim();
  if (!taskDescription) {
    return { errorKey: 'scheduler.intake.errors.taskRequired' };
  }

  if (!isPastAppointment && !editForm.scheduledDate) {
    return { errorKey: 'scheduler.intake.errors.scheduledRequired' };
  }

  if (!editForm.dueDateTime) {
    return { errorKey: 'scheduler.intake.errors.dueRequired' };
  }

  const licensePlate = editForm.licensePlate.trim().toUpperCase();
  const brand = editForm.brand.trim();
  const model = editForm.model.trim();
  if (!licensePlate || !brand || !model) {
    return { errorKey: 'scheduler.intake.errors.vehicleRequiredFields' };
  }

  const year = Number(editForm.year);
  if (Number.isNaN(year) || year < 1886 || year > 2100) {
    return { errorKey: 'scheduler.intake.errors.vehicleYearInvalid' };
  }

  const mileageKm = Number(editForm.mileageKm);
  const enginePowerHp = Number(editForm.enginePowerHp);
  const engineTorqueNm = Number(editForm.engineTorqueNm);

  if (
    Number.isNaN(mileageKm) || mileageKm < VEHICLE_NUMERIC_LIMITS.mileageKm.min || mileageKm > VEHICLE_NUMERIC_LIMITS.mileageKm.max ||
    Number.isNaN(enginePowerHp) || enginePowerHp < VEHICLE_NUMERIC_LIMITS.enginePowerHp.min || enginePowerHp > VEHICLE_NUMERIC_LIMITS.enginePowerHp.max ||
    Number.isNaN(engineTorqueNm) || engineTorqueNm < VEHICLE_NUMERIC_LIMITS.engineTorqueNm.min || engineTorqueNm > VEHICLE_NUMERIC_LIMITS.engineTorqueNm.max
  ) {
    return { errorKey: 'scheduler.intake.errors.vehicleNumberInvalid' };
  }

  const scheduledMs = isPastAppointment
    ? Date.parse(appointment.scheduledDate)
    : Date.parse(editForm.scheduledDate);

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

  return {
    request: {
      scheduledDate: new Date(scheduledMs).toISOString(),
      dueDateTime: new Date(dueMs).toISOString(),
      taskDescription,
      licensePlate,
      brand,
      model,
      year,
      mileageKm,
      enginePowerHp,
      engineTorqueNm,
    },
  };
}

export function buildUpdatedAppointmentSnapshot(
  appointment: AppointmentDto,
  request: UpdateAppointmentRequest,
): AppointmentDto {
  return {
    ...appointment,
    scheduledDate: request.scheduledDate,
    dueDateTime: request.dueDateTime,
    taskDescription: request.taskDescription,
    vehicle: {
      ...appointment.vehicle,
      licensePlate: request.licensePlate,
      brand: request.brand,
      model: request.model,
      year: request.year,
      mileageKm: request.mileageKm,
      enginePowerHp: request.enginePowerHp,
      engineTorqueNm: request.engineTorqueNm,
    },
  };
}

function normalizeRangedNumberInput(rawValue: string, min: number, max: number): string {
  if (rawValue.trim() === '') {
    return '';
  }

  const parsed = Number(rawValue);
  if (Number.isNaN(parsed)) {
    return '';
  }

  const clamped = Math.min(max, Math.max(min, parsed));
  return String(clamped);
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
