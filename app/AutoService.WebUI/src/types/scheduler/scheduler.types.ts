/** Scheduler request/response type contracts. */

import type { DrivetrainType } from '../customers/customers.types';

/** Full vehicle representation including owner information; embedded in {@link AppointmentDto}. */
export interface VehicleDto {
  /** Unique vehicle identifier. */
  id: number;
  /** License plate number (e.g. {@code "ABC-123"}). */
  licensePlate: string;
  /** Vehicle identification number. */
  vin: string;
  brand: string;
  model: string;
  year: number;
  /** Current odometer reading in kilometers. */
  mileageKm: number;
  /** Engine power in kilowatts. */
  enginePowerKw: number;
  drivetrainType: DrivetrainType;
  /** Unique identifier of this vehicle's owner. */
  customerId: number;
}

/** Summary of a mechanic assigned to an appointment, with professional details and profile-picture availability. */
export interface MechanicSummaryDto {
  /** Unique mechanic identifier. */
  id: number;
  fullName: string;
  /** Primary area of specialization (e.g. "Engine", "Transmission"). */
  specialization: string;
  /** Whether the mechanic has an uploaded profile picture. */
  hasProfilePicture: boolean;
}

/** Appointment lifecycle status; {@code 'InProgress'} is the initial state right after intake creation. */
export type AppointmentStatus = 'InProgress' | 'Completed' | 'Cancelled';

/** Full appointment representation returned by the scheduler API, with scheduling, vehicle and mechanics. */
export interface AppointmentDto {
  /** Unique appointment identifier. */
  id: number;
  scheduledDate: string;
  intakeCreatedAt: string;
  dueDateTime: string;
  taskDescription: string;
  status: AppointmentStatus;
  /** Timestamp when completed, or {@code null} if not yet completed. */
  completedAt?: string | null;
  /** Timestamp when cancelled, or {@code null} if not cancelled. */
  canceledAt?: string | null;
  vehicle: VehicleDto;
  mechanics: MechanicSummaryDto[];
}

/** Request payload for updating an appointment's lifecycle status ({@code PATCH /api/appointments/{id}/status}). */
export interface UpdateStatusRequest {
  /** Target status to transition to. */
  status: AppointmentStatus;
}

/** Client-side representation of a single calendar-grid day, built from monthly appointment data. */
export interface CalendarDay {
  date: Date;
  appointments: AppointmentDto[];
  /** Whether this day is today's date. */
  isToday: boolean;
  /** Whether this day belongs to the currently displayed month. */
  isCurrentMonth: boolean;
}

/** Vehicle data from the customer lookup endpoint; a simplified, owner-free shape used in the intake form. */
export interface SchedulerVehicleLookupDto {
  /** Unique vehicle identifier. */
  id: number;
  licensePlate: string;
  /** Vehicle identification number. */
  vin: string;
  brand: string;
  model: string;
  year: number;
  /** Current odometer reading in kilometers. */
  mileageKm: number;
  /** Engine power in kilowatts. */
  enginePowerKw: number;
  drivetrainType: DrivetrainType;
}

/** Customer data from {@code GET /api/customers/by-email}, including registered vehicles for intake selection. */
export interface SchedulerCustomerLookupDto {
  /** Unique customer identifier. */
  id: number;
  firstName: string;
  /** Customer's middle name, or {@code null} if not set. */
  middleName: string | null;
  lastName: string;
  email: string;
  /** Phone number, or {@code null} if not set. */
  phoneNumber: string | null;
  vehicles: SchedulerVehicleLookupDto[];
  /** Vehicle matched by the lookup endpoint, when applicable. */
  matchedVehicleId?: number | null;
}

/** Request payload for registering a new vehicle during intake, when no existing vehicle fits. */
export interface SchedulerNewVehicleRequest {
  licensePlate: string;
  /** Vehicle identification number. */
  vin: string;
  brand: string;
  model: string;
  year: number;
  /** Current odometer reading in kilometers. */
  mileageKm: number;
  /** Engine power in kilowatts. */
  enginePowerKw: number;
  drivetrainType: DrivetrainType;
}

/** Request payload for {@code POST /api/appointments/intake}; either {@link vehicleId} (existing) or {@link vehicle} (new) must be provided. */
export interface SchedulerCreateIntakeRequest {
  /** Email of the customer owning the vehicle. */
  customerEmail: string;
  /** Customer first name (optional for mechanic-email owner-link resolution). */
  customerFirstName?: string;
  customerMiddleName?: string;
  /** Customer last name (optional for mechanic-email owner-link resolution). */
  customerLastName?: string;
  customerPhoneNumber?: string;
  vehicleId?: number;
  vehicle?: SchedulerNewVehicleRequest;
  scheduledDate: string;
  dueDateTime: string;
  taskDescription: string;
}

/** Request payload for updating an existing appointment ({@code PUT /api/appointments/{id}}). */
export interface UpdateAppointmentRequest {
  /** Optional scheduled service date for backward compatibility. */
  scheduledDate?: string;
  dueDateTime: string;
  taskDescription: string;
}

/** Request payload for updating appointment vehicle details ({@code PUT /api/appointments/{id}/vehicle}). */
export interface UpdateAppointmentVehicleRequest {
  licensePlate: string;
  /** Vehicle identification number. */
  vin: string;
  brand: string;
  model: string;
  year: number;
  /** Vehicle odometer reading in kilometers. */
  mileageKm: number;
  /** Vehicle engine power in kilowatts. */
  enginePowerKw: number;
  drivetrainType: DrivetrainType;
}