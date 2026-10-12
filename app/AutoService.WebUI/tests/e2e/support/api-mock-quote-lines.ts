/** Mocked quote line routes (add/update/remove on a draft): mirrors the API snapshot rule (D40) -
 * a catalog reference fills description/net price/VAT rate, and any field the request still carries overrides it. */
import type { Route } from '@playwright/test';
import type { QuoteDetailDto, QuoteLineDto, QuoteLineRequest } from '../../../src/types/quotes/quotes.types';
import type { MockApiState } from './test-data';
import { INVALID_VAT_RATE_DETAIL, isAllowedVatRate } from './api-mock-catalog-pricing';
import { fulfillJson } from './api-mock-response';
import {
  applyQuoteWrite,
  recalculateQuoteLine,
  rejectQuoteVersion,
  replaceQuote,
  toQuoteDetailResponse,
} from './api-mock-quote-support';

/** Resolved description, net unit price and VAT rate for one line. */
interface QuoteLineSnapshot {
  description: string;
  netUnitPrice: number;
  vatRatePercent: number;
}

/** Resolves the catalog snapshot, letting request overrides win over it. */
function resolveSnapshot(state: MockApiState, payload: QuoteLineRequest): QuoteLineSnapshot | null {
  const part = payload.lineKind === 'Part'
    ? state.parts.find((candidate) => candidate.id === payload.partId)
    : undefined;
  const laborType = payload.lineKind === 'Labor'
    ? state.laborTypes.find((candidate) => candidate.id === payload.laborTypeId)
    : undefined;

  const description = payload.description ?? part?.name ?? laborType?.name;
  const netUnitPrice = payload.netUnitPrice ?? part?.netUnitPrice ?? laborType?.hourlyNetRate;
  const vatRatePercent = payload.vatRatePercent ?? part?.vatRatePercent ?? laborType?.vatRatePercent;

  if (description === undefined || netUnitPrice === undefined || vatRatePercent === undefined) {
    return null;
  }

  return { description, netUnitPrice, vatRatePercent };
}

/** Rejects a line snapshot whose VAT rate is not 5, 18 or 27, like the server. */
async function rejectInvalidVat(route: Route, snapshot: QuoteLineSnapshot): Promise<boolean> {
  if (!isAllowedVatRate(snapshot.vatRatePercent)) {
    await fulfillJson(route, { detail: INVALID_VAT_RATE_DETAIL }, 422);
    return true;
  }

  return false;
}

/** Rejects any line write on a quote that is no longer a draft. */
async function rejectNonDraft(route: Route, quote: QuoteDetailDto): Promise<boolean> {
  if (quote.status !== 'Draft') {
    await fulfillJson(route, { detail: 'Lines can only be edited while the quote is a draft.' }, 409);
    return true;
  }

  return false;
}

/** Replaces a quote in the state with its recalculated successor and answers with it. */
async function saveAndRespond(
  route: Route,
  state: MockApiState,
  previous: QuoteDetailDto,
  successor: QuoteDetailDto,
): Promise<void> {
  const saved = applyQuoteWrite(successor);
  replaceQuote(state, previous, saved);
  await fulfillJson(route, toQuoteDetailResponse(saved));
}

/** Adds a line to a draft quote. */
export async function handleAddQuoteLine(route: Route, state: MockApiState, quote: QuoteDetailDto): Promise<void> {
  if (await rejectNonDraft(route, quote)) {
    return;
  }

  const payload = route.request().postDataJSON() as QuoteLineRequest;

  if (await rejectQuoteVersion(route, quote, payload.version)) {
    return;
  }

  const snapshot = resolveSnapshot(state, payload);

  if (!snapshot) {
    await fulfillJson(
      route,
      { detail: 'Description, NetUnitPrice, and VatRatePercent are required when no catalog reference is provided.' },
      422,
    );
    return;
  }

  if (await rejectInvalidVat(route, snapshot)) {
    return;
  }

  if (!payload.quantity || payload.quantity <= 0) {
    await fulfillJson(route, { detail: 'Quantity must be greater than 0 and at most 10,000.' }, 422);
    return;
  }

  const line: QuoteLineDto = recalculateQuoteLine({
    id: state.nextQuoteLineId++,
    lineKind: payload.lineKind,
    partId: payload.partId,
    laborTypeId: payload.laborTypeId,
    description: snapshot.description,
    quantity: payload.quantity,
    netUnitPrice: snapshot.netUnitPrice,
    vatRatePercent: snapshot.vatRatePercent,
    netAmount: 0,
    vatAmount: 0,
    grossAmount: 0,
    sortOrder: quote.lines.length + 1,
  });

  const saved = applyQuoteWrite({ ...quote, lines: [...quote.lines, line] });
  replaceQuote(state, quote, saved);
  await fulfillJson(route, toQuoteDetailResponse(saved), 201);
}

/** Updates one line of a draft quote. */
export async function handleUpdateQuoteLine(
  route: Route,
  state: MockApiState,
  quote: QuoteDetailDto,
  lineId: number,
): Promise<void> {
  if (await rejectNonDraft(route, quote)) {
    return;
  }

  const payload = route.request().postDataJSON() as QuoteLineRequest;

  if (await rejectQuoteVersion(route, quote, payload.version)) {
    return;
  }

  const existingLine = quote.lines.find((line) => line.id === lineId);

  if (!existingLine) {
    await fulfillJson(route, { detail: 'Quote line not found.' }, 404);
    return;
  }

  const snapshot = resolveSnapshot(state, payload);

  if (!snapshot) {
    await fulfillJson(
      route,
      { detail: 'Description, NetUnitPrice, and VatRatePercent are required when no catalog reference is provided.' },
      422,
    );
    return;
  }

  if (await rejectInvalidVat(route, snapshot)) {
    return;
  }

  const updatedLine = recalculateQuoteLine({
    ...existingLine,
    lineKind: payload.lineKind,
    partId: payload.partId,
    laborTypeId: payload.laborTypeId,
    description: snapshot.description,
    quantity: payload.quantity,
    netUnitPrice: snapshot.netUnitPrice,
    vatRatePercent: snapshot.vatRatePercent,
  });
  const lines = quote.lines.map((line) => (line === existingLine ? updatedLine : line));

  await saveAndRespond(route, state, quote, { ...quote, lines });
}

/** Removes one line from a draft quote. */
export async function handleDeleteQuoteLine(
  route: Route,
  state: MockApiState,
  quote: QuoteDetailDto,
  lineId: number,
  version: number,
): Promise<void> {
  if (await rejectNonDraft(route, quote)) {
    return;
  }

  if (await rejectQuoteVersion(route, quote, version)) {
    return;
  }

  const lines = quote.lines.filter((line) => line.id !== lineId);

  if (lines.length === quote.lines.length) {
    await fulfillJson(route, { detail: 'Quote line not found.' }, 404);
    return;
  }

  await saveAndRespond(route, state, quote, { ...quote, lines });
}
