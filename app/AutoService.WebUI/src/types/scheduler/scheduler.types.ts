/** Scheduler request/response type contracts. */

/**
 * Summary representation of a customer associated with a vehicle.
 */
export interface CustomerSummaryDto {
  id: number;
  fullName: string;
}

/**
 * Full vehicle representation including owner information.
 * Returned as part of {@link AppointmentDto} to identify the serviced vehicle.
 */
export interface VehicleDto {
  /** Unique vehicle identifier. */
  id: number;
  /** License plate number (e.g. {@code "ABC-123"}). */
  licensePlate: string;
  /** Vehicle manufacturer brand. */
  brand: string;
  /** Vehicle model name. */
  model: string;
  /** Manufacturing year. */
  year: number;
  /** Current odometer reading in kilometers. */
  mileageKm: number;
  /** Engine power in horsepower. */
  enginePowerHp: number;
  /** Engine torque in Newton-meters. */
  engineTorqueNm: number;
  /** Owner of this vehicle. */
  customer: CustomerSummaryDto;
}

/**
 * Summary representation of a mechanic assigned to an appointment.
 * Includes professional details and profile picture availability.
 */
export interface MechanicSummaryDto {
  /** Unique mechanic identifier. */
  id: number;
  /** Full display name of the mechanic. */
  fullName: string;
  /** Primary area of specialization (e.g. "Engine", "Transmission"). */
  specialization: string;
  /** Whether the mechanic has an uploaded profile picture. */
  hasProfilePicture: boolean;
}

/**
 * Possible lifecycle statuses of an appointment.
 * {@code 'InProgress'} is the initial active state after intake creation.
 */
export type AppointmentStatus = 'InProgress' | 'Completed' | 'Cancelled';

/**
 * Full appointment representation returned by the scheduler API.
 * Contains scheduling details, associated vehicle, and assigned mechanics.
 */
export interface AppointmentDto {
  /** Unique appointment identifier. */
  id: number;
  /** Date string for the scheduled service date. */
  scheduledDate: string;
  /** Timestamp when the intake was created. */
  intakeCreatedAt: string;
  /** Timestamp for the service due deadline. */
  dueDateTime: string;
  /** Description of the work to be performed. */
  taskDescription: string;
  /** Current lifecycle status. */
  status: AppointmentStatus;
  /** Timestamp when completed, or {@code null} if not yet completed. */
  completedAt?: string | null;
  /** Timestamp when cancelled, or {@code null} if not cancelled. */
  canceledAt?: string | null;
  /** Vehicle associated with this appointment. */
  vehicle: VehicleDto;
  /** Mechanics currently assigned to this appointment. */
  mechanics: MechanicSummaryDto[];
}

/**
 * Request payload for updating an appointment's lifecycle status
 * ({@code PATCH /api/appointments/{id}/status}).
 */
export interface UpdateStatusRequest {
  /** Target status to transition to. */
  status: AppointmentStatus;
}

/**
 * Client-side representation of a single day in the calendar grid.
 * Built by the calendar view from monthly appointment data.
 */
export interface CalendarDay {
  /** Date object for this calendar cell. */
  date: Date;
  /** Appointments scheduled on this day. */
  appointments: AppointmentDto[];
  /** Whether this day is today's date. */
  isToday: boolean;
  /** Whether this day belongs to the currently displayed month. */
  isCurrentMonth: boolean;
}

/**
 * Vehicle data returned by the customer lookup endpoint.
 * Simplified representation without owner details, used in the intake form.
 */
export interface SchedulerVehicleLookupDto {
  /** Unique vehicle identifier. */
  id: number;
  /** License plate number. */
  licensePlate: string;
  /** Vehicle manufacturer brand. */
  brand: string;
  /** Vehicle model name. */
  model: string;
  /** Manufacturing year. */
  year: number;
  /** Current odometer reading in kilometers. */
  mileageKm: number;
  /** Engine power in horsepower. */
  enginePowerHp: number;
  /** Engine torque in Newton-meters. */
  engineTorqueNm: number;
}

/**
 * Customer data returned by the email lookup endpoint
 * ({@code GET /api/customers/by-email}).
 * Includes the customer's registered vehicles for intake selection.
 */
export interface SchedulerCustomerLookupDto {
  /** Unique customer identifier. */
  id: number;
  /** Customer's first name. */
  firstName: string;
  /** Customer's middle name, or {@code null} if not set. */
  middleName: string | null;
  /** Customer's last name. */
  lastName: string;
  /** Email address. */
  email: string;
  /** Phone number, or {@code null} if not set. */
  phoneNumber: string | null;
  /** Vehicles registered to this customer. */
  vehicles: SchedulerVehicleLookupDto[];
}

/**
 * Request payload for registering a new vehicle during intake creation.
 * Used when the customer does not have a suitable existing vehicle.
 */
export interface SchedulerNewVehicleRequest {
  /** License plate number of the new vehicle. */
  licensePlate: string;
  /** Vehicle manufacturer brand. */
  brand: string;
  /** Vehicle model name. */
  model: string;
  /** Manufacturing year. */
  year: number;
  /** Current odometer reading in kilometers. */
  mileageKm: number;
  /** Engine power in horsepower. */
  enginePowerHp: number;
  /** Engine torque in Newton-meters. */
  engineTorqueNm: number;
}

/**
 * Request payload for creating a new appointment intake
 * ({@code POST /api/appointments/intake}).
 * Either {@link vehicleId} (existing) or {@link vehicle} (new) must be provided.
 */
export interface SchedulerCreateIntakeRequest {
  /** Email of the customer owning the vehicle. */
  customerEmail: string;
  /** Customer first name (optional for mechanic-email owner-link resolution). */
  customerFirstName?: string;
  /** Customer middle name (optional). */
  customerMiddleName?: string;
  /** Customer last name (optional for mechanic-email owner-link resolution). */
  customerLastName?: string;
  /** Customer phone number (optional). */
  customerPhoneNumber?: string;
  /** ID of an existing vehicle to use for this appointment. */
  vehicleId?: number;
  /** New vehicle details when creating a vehicle during intake. */
  vehicle?: SchedulerNewVehicleRequest;
  /** Date string for the scheduled service date. */
  scheduledDate: string;
  /** Timestamp for the service due deadline. */
  dueDateTime: string;
  /** Description of the work to be performed. */
  taskDescription: string;
}

/**
 * Request payload for updating an existing appointment
 * ({@code PUT /api/appointments/{id}}).
 */
export interface UpdateAppointmentRequest {
  /** Optional scheduled service date for backward compatibility. */
  scheduledDate?: string;
  /** Updated due deadline timestamp. */
  dueDateTime: string;
  /** Updated task description. */
  taskDescription: string;
}

/**
 * Request payload for updating appointment vehicle details
 * ({@code PUT /api/appointments/{id}/vehicle}).
 */
export interface UpdateAppointmentVehicleRequest {
  /** Vehicle license plate number. */
  licensePlate: string;
  /** Vehicle manufacturer brand. */
  brand: string;
  /** Vehicle model name. */
  model: string;
  /** Vehicle manufacturing year. */
  year: number;
  /** Vehicle odometer reading in kilometers. */
  mileageKm: number;
  /** Vehicle engine power in horsepower. */
  enginePowerHp: number;
  /** Vehicle engine torque in Newton-meters. */
  engineTorqueNm: number;
}