/**
 * Fixture data for the Quotes page.
 *
 * Kept in its own file next to `test-data.catalog.fixtures.ts`, for the same
 * reason: `test-data.fixtures.ts` is already at the split limit, and the
 * quote vertical has its own state (quotes plus their id sequences) that
 * `test-data.ts` merges in.
 */
import type { QuoteDetailDto } from '../../../src/types/quotes/quotes.types';
import {
  MOCK_LABOR_TYPE_IDS,
  MOCK_MECHANIC_IDS,
  MOCK_PART_IDS,
  MOCK_QUOTE_IDS,
  MOCK_QUOTE_LINE_IDS,
  MOCK_VEHICLE_IDS,
} from './test-data.constants';

/** Quote portion of the mock API state. */
export interface QuoteFixtureState {
  readonly quotes: QuoteDetailDto[];
  nextQuoteId: number;
  nextQuoteLineId: number;
  nextQuoteSequence: number;
}

/** Far-future deadline, so a sent fixture never expires while the suite runs. */
const FUTURE_VALID_UNTIL = '2099-12-31T23:59:59.000Z';

/** Past deadline, so the expired fixture always exercises the computed expiry flag. */
const PAST_VALID_UNTIL = '2020-01-10T23:59:59.000Z';

const gaborMechanic = { id: MOCK_MECHANIC_IDS.gabor, fullName: 'Gabor Kovacs' };

// Amounts follow the server formula exactly (net rounds to 2 decimals, VAT is
// taken from the net amount, gross is their sum), so a test can tell a
// server-rendered figure from a locally recomputed one.
const draftQuote: QuoteDetailDto = {
  id: MOCK_QUOTE_IDS.draftTimingBelt,
  quoteNumber: 'ARSM-2026-0001',
  title: 'Timing belt replacement',
  notes: 'Customer asked for an estimate before the service date.',
  status: 'Draft',
  isExpired: false,
  createdAt: '2026-09-01T08:00:00.000Z',
  validUntil: FUTURE_VALID_UNTIL,
  sentAt: null,
  decidedAt: null,
  totalNet: 12000,
  totalVat: 3240,
  totalGross: 15240,
  vehicleId: MOCK_VEHICLE_IDS.annaNxe441,
  vehicle: { id: MOCK_VEHICLE_IDS.annaNxe441, licensePlate: 'NXE-441', brand: 'Volkswagen', model: 'Golf' },
  appointmentId: null,
  createdByMechanic: gaborMechanic,
  lines: [
    {
      id: MOCK_QUOTE_LINE_IDS.draftTimingBelt,
      lineKind: 'Part',
      partId: MOCK_PART_IDS.timingBelt,
      laborTypeId: null,
      description: 'Timing belt',
      quantity: 1,
      netUnitPrice: 12000,
      vatRatePercent: 27,
      netAmount: 12000,
      vatAmount: 3240,
      grossAmount: 15240,
      sortOrder: 1,
    },
  ],
  version: 101,
};

const sentQuote: QuoteDetailDto = {
  id: MOCK_QUOTE_IDS.sentDiagnostics,
  quoteNumber: 'ARSM-2026-0002',
  title: 'Diagnostics and brake check',
  notes: null,
  status: 'Sent',
  isExpired: false,
  createdAt: '2026-09-02T09:30:00.000Z',
  validUntil: FUTURE_VALID_UNTIL,
  sentAt: '2026-09-02T10:00:00.000Z',
  decidedAt: null,
  totalNet: 18000,
  totalVat: 4860,
  totalGross: 22860,
  vehicleId: MOCK_VEHICLE_IDS.belaBrc918,
  vehicle: { id: MOCK_VEHICLE_IDS.belaBrc918, licensePlate: 'BRC-918', brand: 'Skoda', model: 'Octavia' },
  appointmentId: null,
  createdByMechanic: gaborMechanic,
  lines: [
    {
      id: MOCK_QUOTE_LINE_IDS.sentDiagnostics,
      lineKind: 'Labor',
      partId: null,
      laborTypeId: MOCK_LABOR_TYPE_IDS.diagnostics,
      description: 'Diagnostics',
      quantity: 2,
      netUnitPrice: 9000,
      vatRatePercent: 27,
      netAmount: 18000,
      vatAmount: 4860,
      grossAmount: 22860,
      sortOrder: 1,
    },
  ],
  version: 102,
};

const expiredQuote: QuoteDetailDto = {
  ...sentQuote,
  id: MOCK_QUOTE_IDS.expiredOilChange,
  quoteNumber: 'ARSM-2026-0003',
  title: 'Oil change offer',
  createdAt: '2019-12-01T09:00:00.000Z',
  validUntil: PAST_VALID_UNTIL,
  sentAt: '2019-12-01T10:00:00.000Z',
  totalNet: 6000,
  totalVat: 1620,
  totalGross: 7620,
  vehicleId: MOCK_VEHICLE_IDS.annaPhe220,
  vehicle: { id: MOCK_VEHICLE_IDS.annaPhe220, licensePlate: 'PHE-220', brand: 'Hyundai', model: 'Ioniq' },
  lines: [
    {
      id: MOCK_QUOTE_LINE_IDS.expiredOilChange,
      lineKind: 'Labor',
      partId: null,
      laborTypeId: MOCK_LABOR_TYPE_IDS.oilChange,
      description: 'Oil change',
      quantity: 1,
      netUnitPrice: 6000,
      vatRatePercent: 27,
      netAmount: 6000,
      vatAmount: 1620,
      grossAmount: 7620,
      sortOrder: 1,
    },
  ],
  version: 103,
};

/** Returns a fresh deep copy of the quote fixtures for one test's mock state. */
export function createQuoteFixtureState(): QuoteFixtureState {
  return {
    quotes: [draftQuote, sentQuote, expiredQuote].map((quote) => ({
      ...quote,
      lines: quote.lines.map((line) => ({ ...line })),
    })),
    nextQuoteId: 7100,
    nextQuoteLineId: 7200,
    nextQuoteSequence: 4,
  };
}
