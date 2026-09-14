/**
 * Mocked quote-level writes: creating a draft under a vehicle, moving a
 * quote through the status flow, and extending its validity.
 */
import type { Route } from '@playwright/test';
import type {
  ChangeQuoteStatusRequest,
  CreateQuoteRequest,
  ExtendQuoteValidityRequest,
  QuoteDetailDto,
} from '../../../src/types/quotes/quotes.types';
import type { MockApiState } from './test-data';
import { fulfillJson } from './api-mock-response';
import {
  applyQuoteWrite,
  rejectQuoteVersion,
  sortedQuotes,
  toQuoteDetailResponse,
  toQuoteListItemResponse,
} from './api-mock-quote-support';
import { MOCK_MECHANIC_IDS } from './test-data.constants';

/** Default validity window the server applies when the request omits one (D22). */
const DEFAULT_VALIDITY_MS = 30 * 24 * 60 * 60 * 1000;

/** Handles the two vehicle-nested quote routes: list and create. */
export async function handleVehicleQuoteRoute(
  route: Route,
  method: string,
  vehicleId: number,
  state: MockApiState,
): Promise<boolean> {
  if (method === 'GET') {
    const quotes = sortedQuotes(state).filter((quote) => quote.vehicleId === vehicleId);
    await fulfillJson(route, quotes.map((quote) => toQuoteListItemResponse(quote)));
    return true;
  }

  if (method !== 'POST') {
    return false;
  }

  const payload = route.request().postDataJSON() as CreateQuoteRequest;

  if (!payload.title?.trim()) {
    await fulfillJson(route, { detail: 'Title cannot be empty.' }, 422);
    return true;
  }

  const vehicle = Object.values(state.vehiclesByCustomerId)
    .flat()
    .find((candidate) => candidate.id === vehicleId);

  if (!vehicle) {
    await fulfillJson(route, { detail: 'Vehicle not found.' }, 404);
    return true;
  }

  const created: QuoteDetailDto = {
    id: state.nextQuoteId++,
    quoteNumber: `ARSM-2026-${String(state.nextQuoteSequence++).padStart(4, '0')}`,
    title: payload.title.trim(),
    notes: payload.notes,
    status: 'Draft',
    isExpired: false,
    createdAt: new Date().toISOString(),
    validUntil: payload.validUntil ?? new Date(Date.now() + DEFAULT_VALIDITY_MS).toISOString(),
    sentAt: null,
    decidedAt: null,
    totalNet: 0,
    totalVat: 0,
    totalGross: 0,
    vehicleId,
    vehicle: {
      id: vehicle.id,
      licensePlate: vehicle.licensePlate,
      brand: vehicle.brand,
      model: vehicle.model,
    },
    appointmentId: payload.appointmentId,
    createdByMechanic: { id: MOCK_MECHANIC_IDS.gabor, fullName: 'Gabor Kovacs' },
    lines: [],
    version: 1,
  };

  state.quotes.push(created);
  await fulfillJson(route, toQuoteDetailResponse(created), 201);
  return true;
}

/** Applies a status transition, enforcing the state machine and the send rule. */
export async function handleChangeQuoteStatus(route: Route, state: MockApiState, index: number): Promise<void> {
  const quote = state.quotes[index];
  const payload = route.request().postDataJSON() as ChangeQuoteStatusRequest;
  const isAllowed = (quote.status === 'Draft' && payload.status === 'Sent')
    || (quote.status === 'Sent' && (payload.status === 'Accepted' || payload.status === 'Rejected'));

  if (!isAllowed) {
    await fulfillJson(route, { detail: `Cannot transition a quote from ${quote.status} to ${payload.status}.` }, 409);
    return;
  }

  if (await rejectQuoteVersion(route, quote, payload.version)) {
    return;
  }

  if (payload.status === 'Sent' && quote.lines.length === 0) {
    await fulfillJson(route, { detail: 'A quote must have at least one line before it can be sent.' }, 409);
    return;
  }

  const now = new Date().toISOString();
  const saved = applyQuoteWrite({
    ...quote,
    status: payload.status,
    sentAt: payload.status === 'Sent' ? now : quote.sentAt,
    decidedAt: payload.status === 'Sent' ? quote.decidedAt : now,
  });
  state.quotes[index] = saved;
  await fulfillJson(route, toQuoteDetailResponse(saved));
}

/** Saves a new validity deadline, with the sent-quote extend-only rule (D23). */
export async function handleExtendQuoteValidity(route: Route, state: MockApiState, index: number): Promise<void> {
  const quote = state.quotes[index];
  const payload = route.request().postDataJSON() as ExtendQuoteValidityRequest;

  if (quote.status === 'Accepted' || quote.status === 'Rejected') {
    await fulfillJson(route, { detail: 'Validity cannot be changed on a decided quote.' }, 409);
    return;
  }

  if (await rejectQuoteVersion(route, quote, payload.version)) {
    return;
  }

  if (new Date(payload.validUntil).getTime() < Date.now()) {
    await fulfillJson(route, { detail: 'ValidUntil cannot be in the past.' }, 422);
    return;
  }

  if (quote.status === 'Sent' && new Date(payload.validUntil) <= new Date(quote.validUntil)) {
    await fulfillJson(
      route,
      { detail: 'ValidUntil can only be extended to a later date while the quote is sent.' },
      422,
    );
    return;
  }

  const saved = applyQuoteWrite({ ...quote, validUntil: payload.validUntil });
  state.quotes[index] = saved;
  await fulfillJson(route, toQuoteDetailResponse(saved));
}
