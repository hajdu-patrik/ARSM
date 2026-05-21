import type { SchedulerCreateIntakeRequest } from '../../../src/types/scheduler/scheduler.types';
import type { CreateVehicleRequest, VehicleDetailDto } from '../../../src/types/customers/customers.types';
import type { MockApiState } from './test-data';

export function createVehicle(state: MockApiState, customerId: number, request: CreateVehicleRequest): VehicleDetailDto {
  const customer = state.customers.find((item) => item.id === customerId);
  if (!customer) {
    throw new Error(`Unknown mock customer ${customerId}`);
  }

  const createdVehicle: VehicleDetailDto = {
    id: state.nextVehicleId,
    ...request,
    customer: {
      id: customer.id,
      firstName: customer.firstName,
      middleName: customer.middleName,
      lastName: customer.lastName,
    },
  };

  state.nextVehicleId += 1;
  state.vehiclesByCustomerId[customerId] = [...(state.vehiclesByCustomerId[customerId] ?? []), createdVehicle];
  customer.vehicleCount += 1;
  customer.vehicleLicensePlates.push(createdVehicle.licensePlate);

  return createdVehicle;
}

export function createAppointment(state: MockApiState, request: SchedulerCreateIntakeRequest) {
  const lookup = state.schedulerLookupCustomers.find((customer) => customer.email === request.customerEmail);
  const vehicle = lookup?.vehicles.find((item) => item.id === request.vehicleId) ?? lookup?.vehicles[0];
  const appointment = {
    id: state.nextAppointmentId,
    scheduledDate: request.scheduledDate,
    intakeCreatedAt: new Date().toISOString(),
    dueDateTime: request.dueDateTime,
    taskDescription: request.taskDescription,
    status: 'InProgress' as const,
    completedAt: null,
    canceledAt: null,
    vehicle: {
      id: vehicle?.id ?? state.nextVehicleId,
      licensePlate: vehicle?.licensePlate ?? request.vehicle?.licensePlate ?? 'NEW-001',
      vin: vehicle?.vin ?? request.vehicle?.vin ?? 'NEWVIN12345678901',
      brand: vehicle?.brand ?? request.vehicle?.brand ?? 'New',
      model: vehicle?.model ?? request.vehicle?.model ?? 'Vehicle',
      year: vehicle?.year ?? request.vehicle?.year ?? 2026,
      mileageKm: vehicle?.mileageKm ?? request.vehicle?.mileageKm ?? 0,
      enginePowerKw: vehicle?.enginePowerKw ?? request.vehicle?.enginePowerKw ?? 0,
      drivetrainType: vehicle?.drivetrainType ?? request.vehicle?.drivetrainType ?? 'Petrol',
      customer: { id: lookup?.id ?? 9999, fullName: lookup ? getLookupName(lookup) : 'New Customer' },
    },
    mechanics: [],
  };

  state.nextAppointmentId += 1;
  state.appointments.push(appointment);
  return appointment;
}

export function getLookupName(customer: { firstName: string; middleName: string | null; lastName: string }): string {
  return [customer.firstName, customer.middleName, customer.lastName].filter(Boolean).join(' ');
}
