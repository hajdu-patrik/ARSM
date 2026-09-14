/**
 * Shared quote helpers for the mock API: amount math, response projections,
 * list ordering, and the optimistic-concurrency check.
 *
 * The mock recomputes line amounts and quote totals the way the server does,
 * and bumps the version on every write, so a total read off the screen in a
 * test is a server-shaped number rather than something the UI derived.
 */
import type { Route } from '@playwright/test';
import type {
  QuoteDetailDto,
  QuoteLineDto,
  QuoteListItemDto,
} from '../../../src/types/quotes/quotes.types';
import type { MockApiState } from './test-data';
import { fulfillJson } from './api-mock-response';

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

/** Returns the quotes newest first, the order the API lists them in. */
export function sortedQuotes(state: MockApiState): QuoteDetailDto[] {
  return [...state.quotes].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}

/**
 * Answers a missing or stale concurrency version the way the API does: 422
 * for a missing one, and the machine-readable 409 conflict body for a stale
 * one.
 * @returns True when the request was answered and the caller must stop.
 */
export async function rejectQuoteVersion(route: Route, quote: QuoteDetailDto, version: number): Promise<boolean> {
  if (!version) {
    await fulfillJson(route, { detail: 'Version is required.' }, 422);
    return true;
  }

  if (version !== quote.version) {
    await fulfillJson(route, { code: 'quote_version_conflict' }, 409);
    return true;
  }

  return false;
}
