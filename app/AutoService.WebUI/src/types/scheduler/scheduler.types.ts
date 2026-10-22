import type { DrivetrainType } from '../customers/customers.types';

/** Full vehicle representation including owner information; embedded in {@link AppointmentDto}. */
interface VehicleDto {
  id: number;
  /** License plate number (e.g. `"ABC-123"`). */
  licensePlate: string;
  /** Vehicle identification number. */
  vin: string;
  brand: string;
  model: string;
  year: number;
  /** Current odometer reading in kilometers. */
  mileageKm: number;
  enginePowerKw: number;
  drivetrainType: DrivetrainType;
  customerId: number;
}

/** Summary of a mechanic assigned to an appointment, with professional details and profile-picture availability. */
interface MechanicSummaryDto {
  id: number;
  fullName: string;
  /** Primary area of specialization (e.g. "Engine", "Transmission"). */
  specialization: string;
  hasProfilePicture: boolean;
}

/** Appointment lifecycle status; `'InProgress'` is the initial state right after intake creation. */
export type AppointmentStatus = 'InProgress' | 'Completed' | 'Cancelled';

/** Full appointment representation returned by the scheduler API, with scheduling, vehicle and mechanics. */
export interface AppointmentDto {
  id: number;
  scheduledDate: string;
  intakeCreatedAt: string;
  dueDateTime: string;
  taskDescription: string;
  status: AppointmentStatus;
  completedAt?: string | null | undefined;
  canceledAt?: string | null | undefined;
  vehicle: VehicleDto;
  mechanics: MechanicSummaryDto[];
  /** Concurrency version that the next status change or update must echo. */
  version: number;
}

/** Request payload for updating an appointment's lifecycle status (`PUT /api/appointments/{id}/status`). */
export interface UpdateStatusRequest {
  status: AppointmentStatus;
  /** Version the appointment was shown at; a stale one is refused with a 409. */
  version: number;
}

/** Client-side representation of a single calendar-grid day, built from monthly appointment data. */
export interface CalendarDay {
  date: Date;
  appointments: AppointmentDto[];
  isToday: boolean;
  isCurrentMonth: boolean;
}

/** Vehicle data from the customer lookup endpoint; a simplified, owner-free shape used in the intake form. */
export interface SchedulerVehicleLookupDto {
  id: number;
  licensePlate: string;
  vin: string;
  brand: string;
  model: string;
  year: number;
  mileageKm: number;
  enginePowerKw: number;
  drivetrainType: DrivetrainType;
}

/** Customer data from `GET /api/customers/by-email`, including registered vehicles for intake selection. */
export interface SchedulerCustomerLookupDto {
  id: number;
  firstName: string;
  middleName: string | null;
  lastName: string;
  email: string;
  phoneNumber: string | null;
  vehicles: SchedulerVehicleLookupDto[];
  /** Vehicle matched by the lookup endpoint, when applicable. */
  matchedVehicleId?: number | null | undefined;
}

/** Request payload for registering a new vehicle during intake, when no existing vehicle fits. */
export interface SchedulerNewVehicleRequest {
  licensePlate: string;
  vin: string;
  brand: string;
  model: string;
  year: number;
  mileageKm: number;
  enginePowerKw: number;
  drivetrainType: DrivetrainType;
}

/** Request payload for `POST /api/appointments/intake`; either {@link vehicleId} (existing) or {@link vehicle} (new) must be provided. */
export interface SchedulerCreateIntakeRequest {
  customerEmail: string;
  /** Customer first name (optional for mechanic-email owner-link resolution). */
  customerFirstName?: string | undefined;
  customerMiddleName?: string | undefined;
  /** Customer last name (optional for mechanic-email owner-link resolution). */
  customerLastName?: string | undefined;
  customerPhoneNumber?: string | undefined;
  vehicleId?: number | undefined;
  vehicle?: SchedulerNewVehicleRequest | undefined;
  scheduledDate: string;
  dueDateTime: string;
  taskDescription: string;
}

/** Request payload for updating an existing appointment (`PUT /api/appointments/{id}`). */
export interface UpdateAppointmentRequest {
  /** Optional scheduled service date for backward compatibility. */
  scheduledDate?: string | undefined;
  dueDateTime: string;
  taskDescription: string;
  /** Version the appointment was shown at; a stale one is refused with a 409. */
  version: number;
}

/** Request payload for updating appointment vehicle details (`PUT /api/appointments/{id}/vehicle`). */
export interface UpdateAppointmentVehicleRequest {
  licensePlate: string;
  vin: string;
  brand: string;
  model: string;
  year: number;
  mileageKm: number;
  enginePowerKw: number;
  drivetrainType: DrivetrainType;
}