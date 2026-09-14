/**
 * Mocked quote routes (plan F4): the `/api/quotes` group plus the two
 * vehicle-nested routes. This file is the router; the writes live in
 * `api-mock-quote-mutations.ts` and `api-mock-quote-lines.ts`, and the shared
 * math, projections and version check in `api-mock-quote-support.ts`.
 */
import type { Route } from '@playwright/test';
import type { UpdateQuoteRequest } from '../../../src/types/quotes/quotes.types';
import type { InstallApiMockOptions } from './api-mocks';
import type { MockApiState } from './test-data';
import { isAuthenticated } from './api-mock-authz';
import { fulfillJson, fulfillNoContent } from './api-mock-response';
import {
  applyQuoteWrite,
  rejectQuoteVersion,
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
    await fulfillJson(route, sortedQuotes(state).map((quote) => toQuoteListItemResponse(quote)));
    return true;
  }

  if (vehicleQuotesMatch) {
    return handleVehicleQuoteRoute(route, method, Number(vehicleQuotesMatch[1]), state);
  }

  return handleQuoteResourceRoute(route, method, path, url, state);
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

  const index = state.quotes.findIndex((quote) => quote.id === Number(quoteMatch[1]));

  if (index < 0) {
    await fulfillJson(route, { detail: 'Quote not found.' }, 404);
    return true;
  }

  const segment = quoteMatch[2];
  // The two DELETE routes carry the concurrency version as a query parameter,
  // because a DELETE has no body to put it in (D39).
  const version = Number(url.searchParams.get('version') ?? 0);

  if (segment?.startsWith('/lines')) {
    return handleQuoteLineRoute(route, method, state, index, quoteMatch[3], version);
  }

  if (segment === '/status' && method === 'POST') {
    await handleChangeQuoteStatus(route, state, index);
    return true;
  }

  if (segment === '/valid-until' && method === 'PUT') {
    await handleExtendQuoteValidity(route, state, index);
    return true;
  }

  return segment ? false : handleQuoteRootRoute(route, method, state, index, version);
}

async function handleQuoteLineRoute(
  route: Route,
  method: string,
  state: MockApiState,
  index: number,
  rawLineId: string | undefined,
  version: number,
): Promise<boolean> {
  if (method === 'POST') {
    await handleAddQuoteLine(route, state, index);
    return true;
  }

  if (rawLineId === undefined) {
    return false;
  }

  const lineId = Number(rawLineId);

  if (method === 'PUT') {
    await handleUpdateQuoteLine(route, state, index, lineId);
    return true;
  }

  if (method === 'DELETE') {
    await handleDeleteQuoteLine(route, state, index, lineId, version);
    return true;
  }

  return false;
}

async function handleQuoteRootRoute(
  route: Route,
  method: string,
  state: MockApiState,
  index: number,
  version: number,
): Promise<boolean> {
  const quote = state.quotes[index];

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
    state.quotes[index] = saved;
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

  state.quotes.splice(index, 1);
  await fulfillNoContent(route);
  return true;
}
