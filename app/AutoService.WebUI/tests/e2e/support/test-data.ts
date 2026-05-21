import type { AppointmentDto, SchedulerCustomerLookupDto } from '../../../src/types/scheduler/scheduler.types';
import type { CustomerListItem, VehicleDetailDto } from '../../../src/types/customers/customers.types';
import type { MechanicListItem } from '../../../src/services/admin/admin.service';
import type { ProfileData } from '../../../src/types/profile/profile.types';
import { MOCK_MECHANIC_IDS } from './test-data.constants';
import { createFixtureState } from './test-data.fixtures';

export {
  MOCK_APPOINTMENT_IDS,
  MOCK_CUSTOMER_IDS,
  MOCK_MECHANIC_IDS,
  MOCK_VEHICLE_IDS,
  PROTECTED_DEMO_MECHANIC_EMAILS,
} from './test-data.constants';

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

export function createMockApiState(profileEmail: string): MockApiState {
  const fixtures = createFixtureState();

  return {
    ...fixtures,
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
    nextVehicleId: 2000,
    nextAppointmentId: 6000,
    nextMechanicPersonId: 9000,
  };
}
