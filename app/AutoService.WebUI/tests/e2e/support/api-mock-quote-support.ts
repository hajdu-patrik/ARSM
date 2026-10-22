/** Shared quote mock helpers: amount math, response projections, list ordering, concurrency check;
 * every write recomputes totals and bumps the version (tests/CLAUDE.md Coverage Anchors). */
import type { Route } from '@playwright/test';
import type {
  QuoteDetailDto,
  QuoteLineDto,
  QuoteListItemDto,
} from '../../../src/types/quotes/quotes.types';
import type { MockApiState } from './test-data';
import { rejectStaleVersion } from './api-mock-response';

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
export function computeIsExpired(quote: QuoteDetailDto): boolean {
  return quote.status === 'Sent' && new Date(quote.validUntil).getTime() < Date.now();
}

/** Returns the detail projection, with the freshly computed expiry flag. */
export function toQuoteDetailResponse(quote: QuoteDetailDto): QuoteDetailDto {
  return { ...quote, isExpired: computeIsExpired(quote) };
}

/** Returns the list-row projection: no lines, no notes, expiry computed. */
export function toQuoteListItemResponse(quote: QuoteDetailDto): QuoteListItemDto {
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
  };
}

/** Stores the saved quote in place of the one it was derived from. */
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
