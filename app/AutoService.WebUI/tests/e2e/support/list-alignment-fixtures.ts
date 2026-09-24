/**
 * Worst-case fixture seeding for the list-alignment regression spec.
 *
 * Mutates the mock API state returned by `installApiMocks` with data sized to
 * stress the shared `DataList` column model: a title at the server's max
 * length, a part number and a labor code at the server's max identifier
 * length, amounts in the tens of millions, every quote status, and both a
 * fractional and a near-6-digit line quantity - the same shapes a column
 * grid silently breaks on long before a screenshot would show it.
 * @module tests/e2e/support/list-alignment-fixtures
 */
import { MAX_CATALOG_IDENTIFIER_LENGTH } from '../../../src/types/catalog/catalog.types';
import { MAX_QUOTE_TITLE_LENGTH } from '../../../src/types/quotes/quotes.types';
import type { MockApiState } from './test-data';

/** At the server's max quote title length, the worst case for a truncating column. */
const LONG_TITLE = 'Teljes futomu-felujitas, vezerles- es kuplungcsere, klimatoltes, valamint negykerek-beallitas garanciailis atvizsgalassal es garanciahosszabbitassal is'
  .slice(0, MAX_QUOTE_TITLE_LENGTH);

/** At the server's max part-number/labor-code length. */
const LONG_PART_NUMBER = 'OEM-1234567890-ABCDEFGHIJKLMNOPQRSTUVWXYZ'.slice(0, MAX_CATALOG_IDENTIFIER_LENGTH);
const LONG_LABOR_CODE = 'LBR-FULL-SUSPENSION-OVERHAUL-PREMIUM-XL-EXTRA'.slice(0, MAX_CATALOG_IDENTIFIER_LENGTH);

/**
 * Pushes worst-case quotes, parts and labor types into a fresh mock state, so
 * every list under test renders its longest title, its highest amount, every
 * quote status, and both a fractional and a near-6-digit line quantity at
 * once.
 * @param state Mutable mock API state returned by `installApiMocks`.
 */
export function seedWorstCaseListData(state: MockApiState): void {
  const [draft, sent] = state.quotes;

  draft.lines.push(
    {
      ...draft.lines[0],
      id: 79001,
      description: LONG_TITLE,
      quantity: 9999.99,
      netUnitPrice: 9999.5,
      netAmount: 99994900,
      vatAmount: 26998623,
      grossAmount: 126993523,
      sortOrder: 2,
    },
    {
      ...sent.lines[0],
      id: 79002,
      description: 'Diagnosztika',
      quantity: 1.5,
      netUnitPrice: 9000,
      netAmount: 13500,
      vatAmount: 3645,
      grossAmount: 17145,
      sortOrder: 3,
    },
  );

  state.quotes.push(
    {
      ...sent,
      id: 79101,
      quoteNumber: 'ARSM-2026-0104',
      title: LONG_TITLE,
      status: 'Accepted',
      createdAt: '2026-05-11T09:00:00.000Z',
      decidedAt: '2026-05-12T09:00:00.000Z',
      totalNet: 77767269.29,
      totalVat: 20997162.71,
      totalGross: 98764432,
      vehicle: { ...sent.vehicle, licensePlate: 'AABB-123' },
      lines: [{ ...sent.lines[0], id: 79111, netAmount: 77767269, vatAmount: 20997163, grossAmount: 98764432 }],
    },
    {
      ...sent,
      id: 79102,
      quoteNumber: 'ARSM-2026-0105',
      title: 'Olaj',
      status: 'Rejected',
      createdAt: '2026-11-03T09:00:00.000Z',
      decidedAt: '2026-11-04T09:00:00.000Z',
      totalNet: 900,
      totalVat: 243,
      totalGross: 1143,
      vehicle: { ...sent.vehicle, licensePlate: 'X-1' },
      lines: [{ ...sent.lines[0], id: 79112 }],
    },
    {
      ...sent,
      id: 79103,
      quoteNumber: 'ARSM-2026-0106',
      title: 'Winter tyre change and storage',
      status: 'Accepted',
      createdAt: '2026-12-01T09:00:00.000Z',
      decidedAt: '2026-12-02T09:00:00.000Z',
      totalNet: 1245000,
      totalVat: 336150,
      totalGross: 1581150,
      lines: [
        { ...sent.lines[0], id: 79113, vatRatePercent: 27, netAmount: 1000000, vatAmount: 270000, grossAmount: 1270000 },
        { ...draft.lines[0], id: 79114, vatRatePercent: 5, netAmount: 245000, vatAmount: 12250, grossAmount: 257250 },
      ],
    },
  );

  state.parts.push(
    {
      id: 39001,
      partNumber: LONG_PART_NUMBER,
      name: LONG_TITLE,
      netUnitPrice: 78740157.47,
      vatRatePercent: 27,
      grossUnitPrice: 99999999.99,
    },
    { id: 39002, partNumber: 'A1', name: 'Izzo', netUnitPrice: 95, vatRatePercent: 5, grossUnitPrice: 99.75 },
  );

  state.laborTypes.push(
    {
      id: 49001,
      code: LONG_LABOR_CODE,
      name: LONG_TITLE,
      hourlyNetRate: 125000.5,
      vatRatePercent: 27,
      grossHourlyRate: 158750.64,
    },
    { id: 49002, code: 'L', name: 'Mosas', hourlyNetRate: 0.5, vatRatePercent: 0, grossHourlyRate: 0.5 },
  );
}
