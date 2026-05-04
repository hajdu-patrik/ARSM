/** Customer and vehicle contracts used by the customers registry page. */

/** Customer list item returned by {@code GET /api/customers}. */
export interface CustomerListItem {
  id: number;
  firstName: string;
  middleName: string | null;
  lastName: string;
  email: string;
  phoneNumber: string | null;
  vehicleCount: number;
}

/** Request payload for creating a customer via {@code POST /api/customers}. */
export interface CreateCustomerRequest {
  firstName: string;
  middleName?: string | null;
  lastName: string;
  email: string;
  phoneNumber?: string | null;
}

/** Request payload for updating a customer via {@code PUT /api/customers/{id}}. */
export interface UpdateCustomerRequest {
  firstName: string;
  middleName?: string | null;
  lastName: string;
  email: string;
  phoneNumber?: string | null;
}

/** Minimal customer summary embedded in a vehicle response. */
export interface VehicleCustomerSummary {
  id: number;
  firstName: string;
  middleName: string | null;
  lastName: string;
}

/** Vehicle details returned by vehicle endpoints. */
export interface VehicleDetailDto {
  id: number;
  licensePlate: string;
  brand: string;
  model: string;
  year: number;
  mileageKm: number;
  enginePowerHp: number;
  engineTorqueNm: number;
  customer: VehicleCustomerSummary;
}

/** Request payload for creating a vehicle via {@code POST /api/customers/{customerId}/vehicles}. */
export interface CreateVehicleRequest {
  licensePlate: string;
  brand: string;
  model: string;
  year: number;
  mileageKm: number;
  enginePowerHp: number;
  engineTorqueNm: number;
}

/** Request payload for updating a vehicle via {@code PUT /api/vehicles/{id}}. */
export interface UpdateVehicleRequest {
  licensePlate: string;
  brand: string;
  model: string;
  year: number;
  mileageKm: number;
  enginePowerHp: number;
  engineTorqueNm: number;
}
