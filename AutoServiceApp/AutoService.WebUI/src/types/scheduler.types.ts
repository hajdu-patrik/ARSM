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
  taskDescription: string;
  status: AppointmentStatus;
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