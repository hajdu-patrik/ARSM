/** Mocked quote routes (`/api/quotes` plus its two vehicle-nested routes): this is the router; writes
 * live in `api-mock-quote-mutations.ts`/`api-mock-quote-lines.ts`, shared math in `api-mock-quote-support.ts`. */
import type { Route } from '@playwright/test';
import type { QuoteDetailDto, UpdateQuoteRequest } from '../../../src/types/quotes/quotes.types';
import type { InstallApiMockOptions } from './api-mocks';
import type { MockApiState } from './test-data';
import { isAuthenticated } from './api-mock-authz';
import { fulfillPaged } from './api-mock-paging';
import { fulfillJson, fulfillNoContent } from './api-mock-response';
import {
  applyQuoteWrite,
  rejectQuoteVersion,
  replaceQuote,
  sortedQuotes,
  toQuoteDetailResponse,
  toQuoteListItemResponse,
} from './api-mock-quote-support';
import { handleAddQuoteLine, handleDeleteQuoteLine, handleUpdateQuoteLine } from './api-mock-quote-lines';
import {
  handleChangeQuoteStatus,
  handleExtendQuoteValidity,
  handleVehicleQuoteRoute,
} from './api-mock-quote-mutations';

/** Stored statuses the list accepts as a filter (Expired is computed, never stored). */
const QUOTE_STORED_STATUSES: readonly string[] = ['draft', 'sent', 'accepted', 'rejected'];

/** Matches `/api/quotes/{id}` and its `/lines`, `/status` and `/valid-until` sub-routes. */
const QUOTE_RESOURCE_PATTERN = /^\/api\/quotes\/(\d+)(\/lines(?:\/(\d+))?|\/status|\/valid-until)?$/;

/** Dispatches `/api/quotes` and `/api/vehicles/{id}/quotes` mock requests. */
export async function tryHandleQuoteRoute(
  route: Route,
  method: string,
  path: string,
  url: URL,
  state: MockApiState,
  options: InstallApiMockOptions,
): Promise<boolean> {
  const vehicleQuotesMatch = /^\/api\/vehicles\/(\d+)\/quotes$/.exec(path);

  if (!path.startsWith('/api/quotes') && !vehicleQuotesMatch) {
    return false;
  }

  if (!isAuthenticated(options)) {
    await fulfillJson(route, { detail: 'Unauthorized' }, 401);
    return true;
  }

  if (path === '/api/quotes' && method === 'GET') {
    await handleQuoteList(route, url, state);
    return true;
  }

  if (vehicleQuotesMatch) {
    return handleVehicleQuoteRoute(route, method, Number(vehicleQuotesMatch[1]), state);
  }

  return handleQuoteResourceRoute(route, method, path, url, state);
}

/** Lists quotes newest first, filtered like the API: stored status, expired, vehicle, appointment and search. */
async function handleQuoteList(route: Route, url: URL, state: MockApiState): Promise<void> {
  const status = url.searchParams.get('status');
  const vehicleId = url.searchParams.get('vehicleId');
  const appointmentId = url.searchParams.get('appointmentId');
  const expired = url.searchParams.get('expired');

  if (status !== null && !QUOTE_STORED_STATUSES.includes(status.toLowerCase())) {
    await fulfillJson(route, { detail: 'Status must be one of: Draft, Sent, Accepted, Rejected.' }, 422);
    return;
  }

  const matching = sortedQuotes(state)
    .filter((quote) => status === null || quote.status.toLowerCase() === status.toLowerCase())
    .filter((quote) => vehicleId === null || quote.vehicleId === Number(vehicleId))
    .filter((quote) => appointmentId === null || quote.appointmentId === Number(appointmentId))
    .map((quote) => toQuoteListItemResponse(quote))
    .filter((quote) => expired === null || quote.isExpired === (expired === 'true'));

  await fulfillPaged(route, matching, {
    searchFields: (quote) => [quote.quoteNumber, quote.title, quote.vehicle.licensePlate],
  });
}

async function handleQuoteResourceRoute(
  route: Route,
  method: string,
  path: string,
  url: URL,
  state: MockApiState,
): Promise<boolean> {
  const quoteMatch = QUOTE_RESOURCE_PATTERN.exec(path);

  if (!quoteMatch) {
    return false;
  }

  const quote = state.quotes.find((candidate) => candidate.id === Number(quoteMatch[1]));

  if (!quote) {
    await fulfillJson(route, { detail: 'Quote not found.' }, 404);
    return true;
  }

  const segment = quoteMatch[2];
  // The two DELETE routes carry the concurrency version as a query parameter,
  // because a DELETE has no body to put it in (D39).
  const version = Number(url.searchParams.get('version') ?? 0);

  if (segment?.startsWith('/lines')) {
    return handleQuoteLineRoute(route, method, state, quote, quoteMatch[3], version);
  }

  if (segment === '/status' && method === 'POST') {
    await handleChangeQuoteStatus(route, state, quote);
    return true;
  }

  if (segment === '/valid-until' && method === 'PUT') {
    await handleExtendQuoteValidity(route, state, quote);
    return true;
  }

  return segment ? false : handleQuoteRootRoute(route, method, state, quote, version);
}

async function handleQuoteLineRoute(
  route: Route,
  method: string,
  state: MockApiState,
  quote: QuoteDetailDto,
  rawLineId: string | undefined,
  version: number,
): Promise<boolean> {
  if (method === 'POST') {
    await handleAddQuoteLine(route, state, quote);
    return true;
  }

  if (rawLineId === undefined) {
    return false;
  }

  const lineId = Number(rawLineId);

  if (method === 'PUT') {
    await handleUpdateQuoteLine(route, state, quote, lineId);
    return true;
  }

  if (method === 'DELETE') {
    await handleDeleteQuoteLine(route, state, quote, lineId, version);
    return true;
  }

  return false;
}

async function handleQuoteRootRoute(
  route: Route,
  method: string,
  state: MockApiState,
  quote: QuoteDetailDto,
  version: number,
): Promise<boolean> {
  if (method === 'GET') {
    await fulfillJson(route, toQuoteDetailResponse(quote));
    return true;
  }

  if (method === 'PUT') {
    const payload = route.request().postDataJSON() as UpdateQuoteRequest;

    if (quote.status !== 'Draft') {
      await fulfillJson(route, { detail: 'Only draft quotes can be edited.' }, 409);
      return true;
    }

    if (await rejectQuoteVersion(route, quote, payload.version)) {
      return true;
    }

    const saved = applyQuoteWrite({ ...quote, title: payload.title, notes: payload.notes });
    replaceQuote(state, quote, saved);
    await fulfillJson(route, toQuoteDetailResponse(saved));
    return true;
  }

  if (method !== 'DELETE') {
    return false;
  }

  if (quote.status !== 'Draft') {
    await fulfillJson(route, { detail: 'Only draft quotes can be deleted.' }, 409);
    return true;
  }

  if (await rejectQuoteVersion(route, quote, version)) {
    return true;
  }

  state.quotes.splice(state.quotes.indexOf(quote), 1);
  await fulfillNoContent(route);
  return true;
}
