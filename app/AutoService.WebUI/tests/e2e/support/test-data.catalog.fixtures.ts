/** Fixture data for the Inventory catalog; split out of `test-data.fixtures.ts` (already at the
 * 250-line split limit) - `test-data.ts` merges it in alongside the customer/appointment fixtures. */
import type { LaborTypeDto, PartDto } from '../../../src/types/catalog/catalog.types';
import { MOCK_LABOR_TYPE_IDS, MOCK_PART_IDS } from './test-data.constants';

/** Catalog portion of the mock API state: parts and labor types. */
export interface CatalogFixtureState {
  readonly parts: PartDto[];
  readonly laborTypes: LaborTypeDto[];
}

// Net * (1 + vat/100) at the fixed demo VAT rate of 27%, matching the backend's display-only gross
// formula (plan F1) exactly, so the initial list renders realistic numbers before any override.
const timingBeltPart: PartDto = {
  id: MOCK_PART_IDS.timingBelt,
  partNumber: 'ALT-1001',
  name: 'Timing belt',
  netUnitPrice: 12000,
  vatRatePercent: 27,
  grossUnitPrice: 15240,
};

const brakePadPart: PartDto = {
  id: MOCK_PART_IDS.brakePad,
  partNumber: 'BRK-2002',
  name: 'Brake pad set',
  netUnitPrice: 8000,
  vatRatePercent: 27,
  grossUnitPrice: 10160,
};

const diagnosticsLaborType: LaborTypeDto = {
  id: MOCK_LABOR_TYPE_IDS.diagnostics,
  code: 'LBR-DIAG',
  name: 'Diagnostics',
  hourlyNetRate: 9000,
  vatRatePercent: 27,
  grossHourlyRate: 11430,
};

const oilChangeLaborType: LaborTypeDto = {
  id: MOCK_LABOR_TYPE_IDS.oilChange,
  code: 'LBR-OIL',
  name: 'Oil change',
  hourlyNetRate: 6000,
  vatRatePercent: 27,
  grossHourlyRate: 7620,
};

/** Returns a fresh copy of the catalog fixture data for one test's mock state. */
export function createCatalogFixtureState(): CatalogFixtureState {
  return {
    parts: [timingBeltPart, brakePadPart].map((part) => ({ ...part })),
    laborTypes: [diagnosticsLaborType, oilChangeLaborType].map((laborType) => ({ ...laborType })),
  };
}
