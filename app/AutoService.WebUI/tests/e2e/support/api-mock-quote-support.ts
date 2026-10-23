/** Shared quote mock helpers: amount math, response projections, list ordering, concurrency check;
 * every write recomputes totals and bumps the version (tests/CLAUDE.md Coverage Anchors). */
import type { Route } from '@playwright/test';
import type { AppointmentDto } from '../../../src/types/scheduler/scheduler.types';
import type {
  QuoteDetailDto,
  QuoteLineDto,
  QuoteListItemDto,
  QuoteLockReason,
} from '../../../src/types/quotes/quotes.types';
import type { MockApiState } from './test-data';
import { fulfillJson, rejectStaleVersion } from './api-mock-response';

/** The lock flags the API derives from the linked appointment (`Lifecycle/AppointmentQuoteLifecycle`). */
interface QuoteLockFlags {
  isLocked: boolean;
  lockReason: QuoteLockReason | null;
  canDelete: boolean;
}

/** Stable 409 codes of a quote write refused by the lock, keyed by reason. */
const LOCK_ERROR_CODES: Record<QuoteLockReason, string> = {
  appointment_completed: 'quote_locked_appointment_completed',
  appointment_cancelled: 'quote_locked_appointment_cancelled',
  appointment_has_accepted_quote: 'quote_locked_appointment_accepted',
};

/** Finds an appointment by id in the scheduler list or in any history list of the mock state. */
function findMockAppointment(state: MockApiState, appointmentId: number): AppointmentDto | undefined {
  const histories = [...Object.values(state.vehicleHistoryByVehicleId), ...Object.values(state.customerHistoryByCustomerId)];

  return [...state.appointments, ...histories.flat()].find((appointment) => appointment.id === appointmentId);
}

/** The lock reason of an appointment id; null for no appointment or one the mock does not know. */
export function resolveAppointmentLockReason(state: MockApiState, appointmentId: number | null): QuoteLockReason | null {
  const appointment = appointmentId === null ? undefined : findMockAppointment(state, appointmentId);

  if (appointment === undefined) {
    return null;
  }

  if (appointment.status === 'Completed') {
    return 'appointment_completed';
  }

  if (appointment.status === 'Cancelled') {
    return 'appointment_cancelled';
  }

  const hasAcceptedQuote = state.quotes.some((quote) => quote.appointmentId === appointment.id && quote.status === 'Accepted');

  return hasAcceptedQuote ? 'appointment_has_accepted_quote' : null;
}

/** Computes the lock flags of one quote: Completed never deletes, Cancelled always does, else Draft only. */
function resolveQuoteLockFlags(state: MockApiState, quote: QuoteDetailDto): QuoteLockFlags {
  const lockReason = resolveAppointmentLockReason(state, quote.appointmentId);

  if (lockReason === 'appointment_completed') {
    return { isLocked: true, lockReason, canDelete: false };
  }

  const canDelete = lockReason === 'appointment_cancelled' || quote.status === 'Draft';

  return { isLocked: lockReason !== null, lockReason, canDelete };
}

/** Answers a write on a quote of a locked appointment with the 409 lock code; returns true when it answered. */
export async function rejectLockedAppointment(route: Route, state: MockApiState, appointmentId: number | null): Promise<boolean> {
  const lockReason = resolveAppointmentLockReason(state, appointmentId);

  if (lockReason === null) {
    return false;
  }

  await fulfillJson(route, { code: LOCK_ERROR_CODES[lockReason] }, 409);
  return true;
}

/** Rounds to 2 decimals away from zero, matching `Pricing/MoneyRounding`. */
function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Recomputes one line's net, VAT, and gross amounts from its quantity and price. */
export function recalculateQuoteLine(line: QuoteLineDto): QuoteLineDto {
  const netAmount = roundMoney(line.quantity * line.netUnitPrice);
  const vatAmount = roundMoney((netAmount * line.vatRatePercent) / 100);

  return { ...line, netAmount, vatAmount, grossAmount: netAmount + vatAmount };
}

/** Recomputes the quote totals from its lines and bumps the concurrency version. */
export function applyQuoteWrite(quote: QuoteDetailDto): QuoteDetailDto {
  const totalNet = quote.lines.reduce((sum, line) => sum + line.netAmount, 0);
  const totalVat = quote.lines.reduce((sum, line) => sum + line.vatAmount, 0);

  return {
    ...quote,
    totalNet,
    totalVat,
    totalGross: totalNet + totalVat,
    version: quote.version + 1,
  };
}

/** Expiry is computed per response, never stored, exactly like the API. */
function computeIsExpired(quote: QuoteDetailDto): boolean {
  return quote.status === 'Sent' && new Date(quote.validUntil).getTime() < Date.now();
}

/** Returns the detail projection, with the freshly computed expiry and lock flags. */
export function toQuoteDetailResponse(state: MockApiState, quote: QuoteDetailDto): QuoteDetailDto {
  return { ...quote, isExpired: computeIsExpired(quote), ...resolveQuoteLockFlags(state, quote) };
}

/** Returns the list-row projection: no lines, no notes, expiry and lock flags computed. */
export function toQuoteListItemResponse(state: MockApiState, quote: QuoteDetailDto): QuoteListItemDto {
  return {
    id: quote.id,
    quoteNumber: quote.quoteNumber,
    title: quote.title,
    status: quote.status,
    isExpired: computeIsExpired(quote),
    createdAt: quote.createdAt,
    validUntil: quote.validUntil,
    totalNet: quote.totalNet,
    totalVat: quote.totalVat,
    totalGross: quote.totalGross,
    vehicleId: quote.vehicleId,
    vehicle: quote.vehicle,
    appointmentId: quote.appointmentId,
    createdByMechanic: quote.createdByMechanic,
    version: quote.version,
    ...resolveQuoteLockFlags(state, quote),
  };
}

export function replaceQuote(state: MockApiState, previous: QuoteDetailDto, saved: QuoteDetailDto): void {
  const index = state.quotes.indexOf(previous);

  if (index === -1) {
    throw new Error(`Quote ${previous.quoteNumber} is not in the mock state.`);
  }

  state.quotes[index] = saved;
}

/** Returns the quotes newest first, the order the API lists them in. */
export function sortedQuotes(state: MockApiState): QuoteDetailDto[] {
  return [...state.quotes].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime() || left.id - right.id,
  );
}

/** Answers a missing or stale quote version the way the API does (422 / 409 `quote_version_conflict`). */
export function rejectQuoteVersion(route: Route, quote: QuoteDetailDto, version: number): Promise<boolean> {
  return rejectStaleVersion(route, quote.version, version, 'quote_version_conflict');
}
