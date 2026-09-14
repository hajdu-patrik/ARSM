import type { AppointmentDto, SchedulerCustomerLookupDto } from '../../../src/types/scheduler/scheduler.types';
import type { CustomerListItem, VehicleDetailDto } from '../../../src/types/customers/customers.types';
import type { MechanicListItem } from '../../../src/services/admin/admin.service';
import type { ProfileData } from '../../../src/types/profile/profile.types';
import type { LaborTypeDto, PartDto } from '../../../src/types/catalog/catalog.types';
import type { QuoteDetailDto } from '../../../src/types/quotes/quotes.types';
import { MOCK_MECHANIC_IDS } from './test-data.constants';
import { createFixtureState } from './test-data.fixtures';
import { createCatalogFixtureState } from './test-data.catalog.fixtures';
import { createQuoteFixtureState } from './test-data.quotes.fixtures';

export {
  MOCK_APPOINTMENT_IDS,
  MOCK_CUSTOMER_IDS,
  MOCK_LABOR_TYPE_IDS,
  MOCK_MECHANIC_IDS,
  MOCK_PART_IDS,
  MOCK_QUOTE_IDS,
  MOCK_QUOTE_LINE_IDS,
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
  readonly parts: PartDto[];
  readonly laborTypes: LaborTypeDto[];
  readonly quotes: QuoteDetailDto[];
  nextVehicleId: number;
  nextAppointmentId: number;
  nextMechanicPersonId: number;
  nextPartId: number;
  nextLaborTypeId: number;
  nextQuoteId: number;
  nextQuoteLineId: number;
  nextQuoteSequence: number;
  /** One-shot override consumed by the next mocked part/labor-type create or update response. */
  catalogGrossOverride: number | null;
}

export function createMockApiState(profileEmail: string): MockApiState {
  const fixtures = createFixtureState();
  const catalogFixtures = createCatalogFixtureState();
  const quoteFixtures = createQuoteFixtureState();

  return {
    ...fixtures,
    ...catalogFixtures,
    ...quoteFixtures,
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
    nextPartId: 3100,
    nextLaborTypeId: 4100,
    catalogGrossOverride: null,
  };
}
