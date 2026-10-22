/** Customer and vehicle contracts used by the customers registry page. */

export const DRIVETRAIN_TYPES = ['Petrol', 'Diesel', 'Hybrid', 'PHEV', 'Electric'] as const;

export type DrivetrainType = (typeof DRIVETRAIN_TYPES)[number];

/** Customer list item returned by `GET /api/customers`. */
export interface CustomerListItem {
  id: number;
  firstName: string;
  middleName: string | null;
  lastName: string;
  email: string;
  phoneNumber: string | null;
  vehicleCount: number;
  vehicleLicensePlates: string[];
}

/** Request payload for creating a customer via `POST /api/customers`. */
export interface CreateCustomerRequest {
  firstName: string;
  middleName?: string | null;
  lastName: string;
  email: string;
  phoneNumber?: string | null;
}

/** Request payload for updating a customer via `PUT /api/customers/{id}`. */
export interface UpdateCustomerRequest {
  firstName: string;
  middleName?: string | null;
  lastName: string;
  email: string;
  phoneNumber?: string | null;
}

/** Minimal customer summary embedded in a vehicle response. */
interface VehicleCustomerSummary {
  id: number;
  firstName: string;
  middleName: string | null;
  lastName: string;
}

/** Vehicle details returned by vehicle endpoints. */
export interface VehicleDetailDto {
  id: number;
  licensePlate: string;
  vin: string;
  brand: string;
  model: string;
  year: number;
  mileageKm: number;
  enginePowerKw: number;
  drivetrainType: DrivetrainType;
  customer: VehicleCustomerSummary;
}

/** Request payload for creating a vehicle via `POST /api/customers/{customerId}/vehicles`. */
export interface CreateVehicleRequest {
  licensePlate: string;
  vin: string;
  brand: string;
  model: string;
  year: number;
  mileageKm: number;
  enginePowerKw: number;
  drivetrainType: DrivetrainType;
}

/** Request payload for updating a vehicle via `PUT /api/vehicles/{id}`. */
export interface UpdateVehicleRequest {
  licensePlate: string;
  vin: string;
  brand: string;
  model: string;
  year: number;
  mileageKm: number;
  enginePowerKw: number;
  drivetrainType: DrivetrainType;
}
