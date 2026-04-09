export interface CustomerSummaryDto {
  id: number;
  fullName: string;
  email: string;
}

export interface VehicleDto {
  id: number;
  licensePlate: string;
  brand: string;
  model: string;
  year: number;
  mileageKm: number;
  enginePowerHp: number;
  engineTorqueNm: number;
  customer: CustomerSummaryDto;
}

export interface MechanicSummaryDto {
  id: number;
  fullName: string;
  email: string;
  specialization: string;
  expertise: string[];
  hasProfilePicture: boolean;
}

export type AppointmentStatus = 'InProgress' | 'Completed' | 'Cancelled';

export interface AppointmentDto {
  id: number;
  scheduledDate: string;
  intakeCreatedAt: string;
  dueDateTime: string;
  taskDescription: string;
  status: AppointmentStatus;
  completedAt?: string | null;
  canceledAt?: string | null;
  vehicle: VehicleDto;
  mechanics: MechanicSummaryDto[];
}

export interface UpdateStatusRequest {
  status: AppointmentStatus;
}

export interface CalendarDay {
  date: Date;
  appointments: AppointmentDto[];
  isToday: boolean;
  isCurrentMonth: boolean;
}

export interface SchedulerVehicleLookupDto {
  id: number;
  licensePlate: string;
  brand: string;
  model: string;
  year: number;
  mileageKm: number;
  enginePowerHp: number;
  engineTorqueNm: number;
}

export interface SchedulerCustomerLookupDto {
  id: number;
  firstName: string;
  middleName: string | null;
  lastName: string;
  email: string;
  phoneNumber: string | null;
  vehicles: SchedulerVehicleLookupDto[];
}

export interface SchedulerNewVehicleRequest {
  licensePlate: string;
  brand: string;
  model: string;
  year: number;
  mileageKm: number;
  enginePowerHp: number;
  engineTorqueNm: number;
}

export interface SchedulerCreateIntakeRequest {
  customerEmail: string;
  customerFirstName?: string;
  customerMiddleName?: string;
  customerLastName?: string;
  customerPhoneNumber?: string;
  vehicleId?: number;
  vehicle?: SchedulerNewVehicleRequest;
  scheduledDate: string;
  dueDateTime: string;
  taskDescription: string;
}

export interface UpdateAppointmentRequest {
  scheduledDate: string;
  dueDateTime: string;
  taskDescription: string;
  licensePlate: string;
  brand: string;
  model: string;
  year: number;
  mileageKm: number;
  enginePowerHp: number;
  engineTorqueNm: number;
}