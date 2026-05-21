import type { AppointmentDto, SchedulerCustomerLookupDto, SchedulerVehicleLookupDto } from '../../../src/types/scheduler/scheduler.types';
import type { CustomerListItem, VehicleDetailDto } from '../../../src/types/customers/customers.types';
import type { MechanicListItem } from '../../../src/services/admin/admin.service';
import type { ProfileData } from '../../../src/types/profile/profile.types';

export const MOCK_CUSTOMER_IDS = {
  anna: 101,
  bela: 102,
  nora: 103,
  adam: 104,
} as const;

export const MOCK_VEHICLE_IDS = {
  annaNxe441: 1001,
  annaPhe220: 1002,
  belaBrc918: 1003,
  adamElc404: 1004,
} as const;

export const MOCK_APPOINTMENT_IDS = {
  hybridInspection: 5001,
} as const;

export const MOCK_MECHANIC_IDS = {
  admin: 8001,
  gabor: 8002,
  peter: 8003,
  mate: 8004,
} as const;

export const PROTECTED_DEMO_MECHANIC_EMAILS = new Set([
  'gabor.kovacs@example.com',
  'peter.nagy@example.com',
  'mate.szabo@example.com',
]);

export interface MockApiState {
  readonly customers: CustomerListItem[];
  readonly vehiclesByCustomerId: Record<number, VehicleDetailDto[]>;
  readonly customerHistoryByCustomerId: Record<number, AppointmentDto[]>;
  readonly vehicleHistoryByVehicleId: Record<number, AppointmentDto[]>;
  readonly schedulerLookupCustomers: SchedulerCustomerLookupDto[];
  readonly appointments: AppointmentDto[];
  readonly profile: ProfileData;
  readonly mechanics: MechanicListItem[];
  nextVehicleId: number;
  nextAppointmentId: number;
  nextMechanicPersonId: number;
}

const annaCustomer: CustomerListItem = {
  id: MOCK_CUSTOMER_IDS.anna,
  firstName: 'Anna',
  middleName: null,
  lastName: 'Kovacs',
  email: 'anna.kovacs@example.test',
  phoneNumber: '+36 30 111 2222',
  vehicleCount: 2,
  vehicleLicensePlates: ['NXE-441', 'PHE-220'],
};

const belaCustomer: CustomerListItem = {
  id: MOCK_CUSTOMER_IDS.bela,
  firstName: 'Bela',
  middleName: null,
  lastName: 'Toth',
  email: 'bela.toth@example.test',
  phoneNumber: '+36 30 333 4444',
  vehicleCount: 1,
  vehicleLicensePlates: ['BRC-918'],
};

const noraCustomer: CustomerListItem = {
  id: MOCK_CUSTOMER_IDS.nora,
  firstName: 'Nora',
  middleName: null,
  lastName: 'Farkas',
  email: 'nora.farkas@example.test',
  phoneNumber: null,
  vehicleCount: 0,
  vehicleLicensePlates: [],
};

const annaVehicles: VehicleDetailDto[] = [
  {
    id: MOCK_VEHICLE_IDS.annaNxe441,
    licensePlate: 'NXE-441',
    vin: 'WVWZZZAUZJW123456',
    brand: 'Volkswagen',
    model: 'Golf',
    year: 2018,
    mileageKm: 124500,
    enginePowerKw: 110,
    drivetrainType: 'Hybrid',
    customer: { id: annaCustomer.id, firstName: annaCustomer.firstName, middleName: null, lastName: annaCustomer.lastName },
  },
  {
    id: MOCK_VEHICLE_IDS.annaPhe220,
    licensePlate: 'PHE-220',
    vin: 'KMHLN4AJXPU654321',
    brand: 'Hyundai',
    model: 'Ioniq',
    year: 2022,
    mileageKm: 41000,
    enginePowerKw: 104,
    drivetrainType: 'PHEV',
    customer: { id: annaCustomer.id, firstName: annaCustomer.firstName, middleName: null, lastName: annaCustomer.lastName },
  },
];

const belaVehicles: VehicleDetailDto[] = [
  {
    id: MOCK_VEHICLE_IDS.belaBrc918,
    licensePlate: 'BRC-918',
    vin: 'TMBJG7NE8K0123456',
    brand: 'Skoda',
    model: 'Octavia',
    year: 2019,
    mileageKm: 88700,
    enginePowerKw: 85,
    drivetrainType: 'Diesel',
    customer: { id: belaCustomer.id, firstName: belaCustomer.firstName, middleName: null, lastName: belaCustomer.lastName },
  },
];

const adamLookupCustomer: SchedulerCustomerLookupDto = {
  id: MOCK_CUSTOMER_IDS.adam,
  firstName: 'Adam',
  middleName: null,
  lastName: 'Kovacs',
  email: 'adam.kovacs@example.test',
  phoneNumber: '+36 30 555 6666',
  vehicles: [
    {
      id: MOCK_VEHICLE_IDS.adamElc404,
      licensePlate: 'ELC-404',
      vin: 'JTDKARFP8J3077777',
      brand: 'Toyota',
      model: 'Prius',
      year: 2020,
      mileageKm: 53200,
      enginePowerKw: 90,
      drivetrainType: 'Electric',
    },
  ],
};

// Keep mock roster aligned with DemoDataSeedFactory mechanic seeds.
const mechanicFixtures: MechanicListItem[] = [
  {
    personId: MOCK_MECHANIC_IDS.admin,
    firstName: 'Admin',
    middleName: null,
    lastName: 'Mechanic',
    email: 'admin.mechanic@example.test',
    phoneNumber: '+36 30 700 1111',
    specialization: 'All',
    hasProfilePicture: false,
    isAdmin: true,
  },
  {
    personId: MOCK_MECHANIC_IDS.gabor,
    firstName: 'Gabor',
    middleName: null,
    lastName: 'Kovacs',
    email: 'gabor.kovacs@example.com',
    phoneNumber: '+36301112233',
    specialization: 'GasolineAndDiesel',
    hasProfilePicture: false,
    isAdmin: false,
  },
  {
    personId: MOCK_MECHANIC_IDS.peter,
    firstName: 'Peter',
    middleName: null,
    lastName: 'Nagy',
    email: 'peter.nagy@example.com',
    phoneNumber: '+36302223344',
    specialization: 'HybridAndElectric',
    hasProfilePicture: false,
    isAdmin: false,
  },
  {
    personId: MOCK_MECHANIC_IDS.mate,
    firstName: 'Mate',
    middleName: null,
    lastName: 'Szabo',
    email: 'mate.szabo@example.com',
    phoneNumber: '+36303334455',
    specialization: 'All',
    hasProfilePicture: false,
    isAdmin: false,
  },
];

function cloneCustomer(customer: CustomerListItem): CustomerListItem {
  return { ...customer, vehicleLicensePlates: [...customer.vehicleLicensePlates] };
}

function cloneVehicle(vehicle: VehicleDetailDto): VehicleDetailDto {
  return { ...vehicle, customer: { ...vehicle.customer } };
}

function toLookupVehicle(vehicle: VehicleDetailDto): SchedulerVehicleLookupDto {
  return {
    id: vehicle.id,
    licensePlate: vehicle.licensePlate,
    vin: vehicle.vin,
    brand: vehicle.brand,
    model: vehicle.model,
    year: vehicle.year,
    mileageKm: vehicle.mileageKm,
    enginePowerKw: vehicle.enginePowerKw,
    drivetrainType: vehicle.drivetrainType,
  };
}

function toLookupCustomer(customer: CustomerListItem, vehicles: VehicleDetailDto[], matchedVehicleId?: number): SchedulerCustomerLookupDto {
  return {
    id: customer.id,
    firstName: customer.firstName,
    middleName: customer.middleName,
    lastName: customer.lastName,
    email: customer.email,
    phoneNumber: customer.phoneNumber,
    vehicles: vehicles.map(toLookupVehicle),
    matchedVehicleId: matchedVehicleId ?? null,
  };
}

function appointmentForVehicle(vehicle: VehicleDetailDto): AppointmentDto {
  return {
    id: MOCK_APPOINTMENT_IDS.hybridInspection,
    scheduledDate: '2026-05-21T09:00:00.000Z',
    intakeCreatedAt: '2026-05-20T08:30:00.000Z',
    dueDateTime: '2026-05-24T17:00:00.000Z',
    taskDescription: 'Hybrid system inspection',
    status: 'Completed',
    completedAt: '2026-05-21T12:30:00.000Z',
    canceledAt: null,
    vehicle: {
      id: vehicle.id,
      licensePlate: vehicle.licensePlate,
      vin: vehicle.vin,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      mileageKm: vehicle.mileageKm,
      enginePowerKw: vehicle.enginePowerKw,
      drivetrainType: vehicle.drivetrainType,
      customer: { id: vehicle.customer.id, fullName: `${vehicle.customer.lastName} ${vehicle.customer.firstName}` },
    },
    mechanics: [],
  };
}

export function createMockApiState(profileEmail: string): MockApiState {
  const vehiclesByCustomerId: Record<number, VehicleDetailDto[]> = {
    [annaCustomer.id]: annaVehicles.map(cloneVehicle),
    [belaCustomer.id]: belaVehicles.map(cloneVehicle),
    [noraCustomer.id]: [],
  };
  const annaLookup = toLookupCustomer(annaCustomer, vehiclesByCustomerId[annaCustomer.id], MOCK_VEHICLE_IDS.annaNxe441);
  const belaLookup = toLookupCustomer(belaCustomer, vehiclesByCustomerId[belaCustomer.id], MOCK_VEHICLE_IDS.belaBrc918);
  const historyAppointment = appointmentForVehicle(vehiclesByCustomerId[annaCustomer.id][0]);

  return {
    customers: [annaCustomer, belaCustomer, noraCustomer].map(cloneCustomer),
    vehiclesByCustomerId,
    customerHistoryByCustomerId: { [annaCustomer.id]: [historyAppointment], [belaCustomer.id]: [], [noraCustomer.id]: [] },
    vehicleHistoryByVehicleId: { [historyAppointment.vehicle.id]: [historyAppointment] },
    schedulerLookupCustomers: [annaLookup, belaLookup, adamLookupCustomer],
    appointments: [],
    profile: {
      personId: MOCK_MECHANIC_IDS.gabor,
      personType: 'mechanic',
      firstName: 'E2E',
      middleName: null,
      lastName: 'Mechanic',
      email: profileEmail,
      phoneNumber: '+36 30 888 9999',
      hasProfilePicture: false,
    },
    mechanics: mechanicFixtures.map((mechanic) => ({ ...mechanic })),
    nextVehicleId: 2000,
    nextAppointmentId: 6000,
    nextMechanicPersonId: 9000,
  };
}